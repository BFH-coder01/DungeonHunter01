// Authoritative game simulation. The browser sends intent only; every position,
// attribute and hit is decided here.

import { TILE, PLAYER_RADIUS, SIGHT_RADIUS, RESPAWN_DELAY_MS, ACTION } from '../shared/constants.js';
import { CONFIG } from '../shared/config.js';
import { makeRng, randomSeed } from '../shared/rng.js';
import { makeWeapon, makeSpell } from '../shared/items.js';
import { AMBIENT_MAX_DIST } from '../shared/sounds.js';
import { generateDungeon, tileAt } from './dungeon.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class Game {
  constructor(seed = randomSeed()) {
    this.seed = seed;
    this.rng = makeRng(seed);
    const { levels, totalLevels } = generateDungeon(this.rng);
    this.levels = levels;
    this.totalLevels = totalLevels;
    this.players = new Map();
    this.groundItems = new Map(); // levelIndex -> array of { uid, x, y, item }
    this.projectiles = [];
    this.nextProjectileId = 1;
    this.events = []; // drained every tick, fanned out to clients
    this.tickCount = 0;
    for (let i = 0; i < levels.length; i++) this.groundItems.set(i, []);
  }

  // --- players ----------------------------------------------------------

  addPlayer(id, name) {
    const p = CONFIG.player;
    const r = this.rng;
    const maxHealth = Math.round(r.float(p.health[0], p.health[1]));
    const maxMana = Math.round(r.float(p.mana[0], p.mana[1]));

    const starterWeapon = makeWeapon('rusted_dagger');
    const starterSpell = makeSpell('spark');
    const inventory = Array(p.inventorySize).fill(null);
    inventory[0] = starterWeapon;
    inventory[1] = starterSpell;

    const player = {
      id,
      name: (name || 'Hunter').slice(0, 16),
      level: 0,
      x: 0,
      y: 0,
      aim: 0,
      move: { x: 0, y: 0 },
      maxHealth,
      health: maxHealth,
      maxMana,
      mana: maxMana,
      speed: Math.round(r.float(p.speed[0], p.speed[1]) * 10) / 10,
      manaRegenPerSec: Math.round(r.float(p.manaRegenPerSec[0], p.manaRegenPerSec[1]) * 10) / 10,
      inventory,
      leftHandUid: starterWeapon.uid,
      rightHandUid: null,
      equippedSpellUid: starterSpell.uid,
      swapUntil: 0,        // busy-until timestamp; you stand still to swap
      swingUntil: 0,
      attackState: null,
      castReadyAt: 0,
      castState: null,
      dodgeReadyAt: 0,
      dodgeUntil: 0,
      invulnerableUntil: 0,
      slowUntil: 0,
      alive: true,
      respawnAt: 0,
      kills: 0,
      deaths: 0,
      explored: new Set(), // tile indices this player has seen
      newlyExplored: [],   // drained into the next snapshot
      visible: new Set(),  // recomputed periodically
    };
    this.players.set(id, player);
    this.respawn(player, true);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  randomSpawn(levelIndex, avoidPlayer = null) {
    const level = this.levels[levelIndex];
    const points = level.spawnPoints;
    if (!points.length) return { x: level.width / 2, y: level.height / 2 };

    // Prefer a spawn point away from where the player just died, and away from
    // anyone currently standing on it.
    const scored = points.map((pt) => {
      let score = this.rng();
      for (const other of this.players.values()) {
        if (!other.alive || other.level !== levelIndex || other === avoidPlayer) continue;
        const d = Math.hypot(other.x - pt.x, other.y - pt.y);
        if (d < 4) score -= 2;
      }
      if (avoidPlayer && Math.hypot(avoidPlayer.x - pt.x, avoidPlayer.y - pt.y) < 8) score -= 1;
      return { pt, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].pt;
  }

  respawn(player, initial = false) {
    const spot = this.randomSpawn(player.level, initial ? null : player);
    player.x = spot.x;
    player.y = spot.y;
    player.health = player.maxHealth;
    player.mana = player.maxMana;
    player.alive = true;
    player.respawnAt = 0;
    player.move = { x: 0, y: 0 };
    player.attackState = null;
    player.castState = null;
    player.swingUntil = 0;
    player.dodgeUntil = 0;
    player.invulnerableUntil = 0;
    if (CONFIG.revealAll) this.revealEntireLevel(player);
    this.updateVision(player);
  }

  // --- fog of war -------------------------------------------------------

  revealEntireLevel(player) {
    const level = this.levels[player.level];
    for (let i = 0; i < level.tiles.length; i++) {
      if (!player.explored.has(i)) {
        player.explored.add(i);
        player.newlyExplored.push(i, level.tiles[i]);
      }
    }
  }

  hasLineOfSight(level, x0, y0, x1, y1) {
    // Sample along the ray; a wall tile between the two points blocks sight.
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor(x0 + dx * t);
      const ty = Math.floor(y0 + dy * t);
      if (tileAt(level, tx, ty) === TILE.WALL) return false;
    }
    return true;
  }

  updateVision(player) {
    const level = this.levels[player.level];
    const visible = new Set();
    const r = Math.ceil(SIGHT_RADIUS);
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);

    for (let y = py - r; y <= py + r; y++) {
      for (let x = px - r; x <= px + r; x++) {
        if (x < 0 || y < 0 || x >= level.width || y >= level.height) continue;
        if (Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) > SIGHT_RADIUS) continue;
        if (!this.hasLineOfSight(level, player.x, player.y, x + 0.5, y + 0.5)) continue;
        const i = y * level.width + x;
        visible.add(i);
        if (!player.explored.has(i)) {
          player.explored.add(i);
          player.newlyExplored.push(i, level.tiles[i]);
        }
      }
    }
    player.visible = visible;
  }

  canSee(player, x, y) {
    if (CONFIG.revealAll) return true;
    const level = this.levels[player.level];
    const i = Math.floor(y) * level.width + Math.floor(x);
    return player.visible.has(i);
  }

  // --- movement ---------------------------------------------------------

  blocked(level, x, y) {
    const r = PLAYER_RADIUS;
    return (
      tileAt(level, Math.floor(x - r), Math.floor(y - r)) === TILE.WALL ||
      tileAt(level, Math.floor(x + r), Math.floor(y - r)) === TILE.WALL ||
      tileAt(level, Math.floor(x - r), Math.floor(y + r)) === TILE.WALL ||
      tileAt(level, Math.floor(x + r), Math.floor(y + r)) === TILE.WALL
    );
  }

  movePlayer(player, dt, now) {
    if (!player.alive) return;
    // Swapping a weapon roots you in place — that is the whole point of it.
    if (now < player.swapUntil) return;

    let { x: mx, y: my } = player.move;
    const len = Math.hypot(mx, my);
    if (len < 0.001) return;
    mx /= len;
    my /= len;

    const level = this.levels[player.level];
    const speedScale = now < player.slowUntil ? 0.55 : 1;
    const step = player.speed * speedScale * dt;
    const nx = player.x + mx * step;
    const ny = player.y + my * step;

    if (!this.blocked(level, nx, player.y)) player.x = nx;
    if (!this.blocked(level, player.x, ny)) player.y = ny;
  }

  // --- actions ----------------------------------------------------------

  findItem(player, uid) {
    return player.inventory.find((it) => it && it.uid === uid) || null;
  }

  handItem(player, hand) {
    const uid = hand === 'left' ? player.leftHandUid : hand === 'right' ? player.rightHandUid : null;
    return uid ? this.findItem(player, uid) : null;
  }

  inventorySide(index) {
    return index < CONFIG.player.inventorySideSize ? 'left' : 'right';
  }

  handleAction(player, msg, now) {
    if (!player.alive && msg.action !== ACTION.EQUIP && msg.action !== ACTION.MOVE_SLOT) return;
    switch (msg.action) {
      case ACTION.ATTACK: return this.doHandAction(player, msg.hand, now);
      case ACTION.CAST: return this.doCast(player, now);
      case ACTION.PICKUP: return this.doPickup(player, now);
      case ACTION.DROP: return this.doDrop(player, msg.uid);
      case ACTION.EQUIP: return this.doEquip(player, msg.uid, now);
      case ACTION.MOVE_SLOT: return this.doMoveSlot(player, msg.from, msg.to);
      default: return undefined;
    }
  }

  doEquip(player, uid, now) {
    const item = this.findItem(player, uid);
    if (!item) return;
    if (item.kind === 'weapon' || item.kind === 'shield') {
      const index = player.inventory.findIndex((it) => it && it.uid === uid);
      if (index === -1) return;
      const hand = this.inventorySide(index);
      const prop = hand === 'left' ? 'leftHandUid' : 'rightHandUid';
      if (player[prop] === uid) {
        player[prop] = null;
        this.emit(player, 'unequip', { name: item.name, hand });
        return;
      }
      // Deliberate, interruptible-by-death swap. No instant hotkey weapons.
      player.swapUntil = now + CONFIG.player.weaponSwapMs;
      player[prop] = uid;
      this.emit(player, 'swap', { name: item.name, hand, ms: CONFIG.player.weaponSwapMs });
    } else if (item.kind === 'spell') {
      // Spells are memorised, not held — switching is free and instant.
      player.equippedSpellUid = player.equippedSpellUid === uid ? null : uid;
      this.emit(player, player.equippedSpellUid ? 'spell' : 'unequip', { name: item.name, hand: 'spell' });
    }
  }

  doMoveSlot(player, from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to)) return;
    if (from < 0 || to < 0 || from >= player.inventory.length || to >= player.inventory.length || from === to) return;
    const equipped = [player.leftHandUid, player.rightHandUid].filter(Boolean);
    [player.inventory[from], player.inventory[to]] = [player.inventory[to], player.inventory[from]];

    // Equipped items follow their slot across a direct left/right swap. If a
    // move would put two equipped items on one side, the later one is safely
    // unequipped rather than creating an impossible two-items-in-one-hand state.
    player.leftHandUid = null;
    player.rightHandUid = null;
    for (const uid of equipped) {
      const index = player.inventory.findIndex((item) => item && item.uid === uid);
      if (index === -1) continue;
      const prop = this.inventorySide(index) === 'left' ? 'leftHandUid' : 'rightHandUid';
      if (!player[prop]) player[prop] = uid;
    }
    this.emit(player, 'loadout', { from, to });
  }

  doHandAction(player, hand, now) {
    if (hand !== 'left' && hand !== 'right') return;
    const item = this.handItem(player, hand);
    if (!item) return;
    if (item.kind === 'weapon') return this.doAttack(player, hand, item, now);
    if (item.kind === 'shield') return this.doDodge(player, hand, item, now);
  }

  doAttack(player, hand, weapon, now) {
    if (now < player.swapUntil || now < player.swingUntil) return;
    const left = this.handItem(player, 'left');
    const right = this.handItem(player, 'right');
    const dualWielding = left?.kind === 'weapon' && right?.kind === 'weapon';
    const damageScale = dualWielding && hand === 'left' ? 0.5 : 1;
    const damage = Math.max(1, Math.round(weapon.damage * damageScale));

    player.swingUntil = now + weapon.swingMs;
    player.attackState = {
      hand,
      uid: weapon.uid,
      name: weapon.name,
      style: weapon.attackStyle,
      damage,
      range: weapon.range,
      minDot: weapon.minDot,
      maxTargets: weapon.maxTargets,
      knockback: weapon.knockback || 0,
      throwable: !!weapon.throwable,
      projectileSpeed: weapon.projectileSpeed || 0,
      startedAt: now,
      resolveAt: now + weapon.windupMs,
      endsAt: now + weapon.swingMs,
      resolved: false,
    };
    this.emit(player, 'windup', { name: weapon.name, hand, ms: weapon.windupMs });
  }

  resolveAttack(player, now) {
    const attack = player.attackState;
    if (!attack || attack.resolved || now < attack.resolveAt) return;
    attack.resolved = true;
    if (attack.throwable) {
      const slot = player.inventory.findIndex((item) => item && item.uid === attack.uid);
      if (slot === -1) return;
      const item = player.inventory[slot];
      player.inventory[slot] = null;
      if (player.leftHandUid === item.uid) player.leftHandUid = null;
      if (player.rightHandUid === item.uid) player.rightHandUid = null;
      const offset = PLAYER_RADIUS + 0.12;
      this.projectiles.push({
        id: `p${this.nextProjectileId++}`,
        ownerId: player.id,
        level: player.level,
        x: player.x + Math.cos(player.aim) * offset,
        y: player.y + Math.sin(player.aim) * offset,
        vx: Math.cos(player.aim),
        vy: Math.sin(player.aim),
        speed: attack.projectileSpeed,
        range: attack.range,
        travelled: 0,
        baseDamage: attack.damage,
        label: attack.name,
        style: 'knife',
        slowMs: 0,
        blastRadius: 0,
        recoverable: true,
        item,
      });
      this.emit(player, 'throw', { name: attack.name, hand: attack.hand });
      return;
    }
    const targets = this.frontTargets(player, attack.range, attack.minDot, attack.maxTargets);
    for (const target of targets) {
      const hit = this.damage(target, attack.damage, player, attack.name, now);
      if (hit && attack.knockback && target.alive) this.knockback(target, player, attack.knockback);
    }
    this.emit(player, 'swing', { name: attack.name, hand: attack.hand, hits: targets.length });
  }

  doDodge(player, hand, shield, now) {
    if (now < player.swapUntil || now < player.dodgeReadyAt) return;
    let dx = player.move.x;
    let dy = player.move.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.001) { dx /= len; dy /= len; }
    else { dx = Math.cos(player.aim); dy = Math.sin(player.aim); }

    const level = this.levels[player.level];
    const steps = Math.max(1, Math.ceil(shield.dodgeDistance / 0.15));
    const step = shield.dodgeDistance / steps;
    for (let i = 0; i < steps; i++) {
      const nx = player.x + dx * step;
      const ny = player.y + dy * step;
      if (this.blocked(level, nx, ny)) break;
      player.x = nx;
      player.y = ny;
    }
    player.dodgeUntil = now + shield.dodgeMs;
    player.invulnerableUntil = player.dodgeUntil;
    player.dodgeReadyAt = now + shield.cooldownMs;
    this.emit(player, 'dodge', { name: shield.name, hand, cooldownMs: shield.cooldownMs });
  }

  doCast(player, now) {
    if (now < player.castReadyAt || player.castState) return;
    const spell = this.findItem(player, player.equippedSpellUid);
    if (!spell) return;
    if (player.mana < spell.manaCost) {
      this.emit(player, 'nomana', { name: spell.name, need: spell.manaCost });
      return;
    }
    player.mana -= spell.manaCost;
    player.castReadyAt = now + spell.cooldownMs;
    player.castState = {
      uid: spell.uid,
      name: spell.name,
      key: spell.key,
      style: spell.projectileStyle,
      damage: spell.damage || 0,
      heal: spell.heal || 0,
      range: spell.range,
      projectileSpeed: spell.projectileSpeed || 0,
      slowMs: spell.slowMs || 0,
      blastRadius: spell.blastRadius || 0,
      startedAt: now,
      resolveAt: now + spell.windupMs,
      resolved: false,
    };
    this.emit(player, 'castwindup', { name: spell.name, ms: spell.windupMs });
  }

  resolveCast(player, now) {
    const cast = player.castState;
    if (!cast || cast.resolved || now < cast.resolveAt) return;
    cast.resolved = true;
    if (cast.heal) {
      const before = player.health;
      player.health = Math.min(player.maxHealth, player.health + cast.heal);
      this.emit(player, 'cast', { name: cast.name, healed: Math.round(player.health - before) });
      return;
    }
    const offset = PLAYER_RADIUS + 0.12;
    this.projectiles.push({
      id: `p${this.nextProjectileId++}`,
      ownerId: player.id,
      level: player.level,
      x: player.x + Math.cos(player.aim) * offset,
      y: player.y + Math.sin(player.aim) * offset,
      vx: Math.cos(player.aim),
      vy: Math.sin(player.aim),
      speed: cast.projectileSpeed,
      range: cast.range,
      travelled: 0,
      baseDamage: cast.damage,
      label: cast.name,
      style: cast.style,
      slowMs: cast.slowMs,
      blastRadius: cast.blastRadius,
    });
    this.emit(player, 'cast', { name: cast.name, launched: true });
  }

  updateProjectiles(dt, now) {
    const survivors = [];
    for (const projectile of this.projectiles) {
      const level = this.levels[projectile.level];
      const owner = this.players.get(projectile.ownerId);
      const distance = projectile.speed * dt;
      const steps = Math.max(1, Math.ceil(distance / 0.12));
      const step = distance / steps;
      let stopped = false;

      for (let i = 0; i < steps && !stopped; i++) {
        const nx = projectile.x + projectile.vx * step;
        const ny = projectile.y + projectile.vy * step;
        projectile.travelled += step;
        if (tileAt(level, Math.floor(nx), Math.floor(ny)) === TILE.WALL) {
          stopped = true;
          break;
        }
        if (level.caches.some((cache) => !cache.looted && Math.hypot(cache.x - nx, cache.y - ny) < 0.46)) {
          stopped = true;
          break;
        }
        projectile.x = nx;
        projectile.y = ny;

        for (const target of this.players.values()) {
          if (!target.alive || target.id === projectile.ownerId || target.level !== projectile.level) continue;
          if (Math.hypot(target.x - nx, target.y - ny) > PLAYER_RADIUS + 0.14) continue;
          const energy = clamp(1 - (projectile.travelled / projectile.range) * 0.6, 0.4, 1);
          const damage = Math.max(1, Math.round(projectile.baseDamage * energy));
          if (projectile.blastRadius > 0) {
            for (const splash of this.players.values()) {
              if (!splash.alive || splash.id === projectile.ownerId || splash.level !== projectile.level) continue;
              const d = Math.hypot(splash.x - nx, splash.y - ny);
              if (d > projectile.blastRadius) continue;
              const splashScale = 1 - 0.45 * (d / projectile.blastRadius);
              this.damage(splash, Math.max(1, Math.round(damage * splashScale)), owner, projectile.label, now);
            }
          } else {
            const hit = this.damage(target, damage, owner, projectile.label, now);
            if (hit && projectile.slowMs && target.alive) target.slowUntil = Math.max(target.slowUntil, now + projectile.slowMs);
          }
          stopped = true;
          break;
        }
        if (projectile.travelled >= projectile.range) stopped = true;
      }
      if (!stopped) survivors.push(projectile);
      else if (projectile.recoverable && projectile.item) {
        this.groundItems.get(projectile.level).push({
          uid: projectile.item.uid,
          x: projectile.x,
          y: projectile.y,
          item: projectile.item,
        });
      }
    }
    this.projectiles = survivors;
  }

  // Living players on this level inside `range` and the weapon's attack arc.
  frontTargets(player, range, minDot, maxTargets = 1) {
    const ax = Math.cos(player.aim);
    const ay = Math.sin(player.aim);
    const targets = [];
    for (const other of this.players.values()) {
      if (other === player || !other.alive || other.level !== player.level) continue;
      const dx = other.x - player.x;
      const dy = other.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > range + PLAYER_RADIUS || d < 0.001) continue;
      if ((dx / d) * ax + (dy / d) * ay < minDot) continue;
      if (!this.hasLineOfSight(this.levels[player.level], player.x, player.y, other.x, other.y)) continue;
      targets.push({ player: other, dist: d });
    }
    targets.sort((a, b) => a.dist - b.dist);
    return targets.slice(0, maxTargets).map((entry) => entry.player);
  }

  frontTarget(player, range, minDot) {
    return this.frontTargets(player, range, minDot, 1)[0] || null;
  }

  knockback(target, source, distance) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.hypot(dx, dy) || 1;
    const level = this.levels[target.level];
    const steps = Math.ceil(distance / 0.12);
    for (let i = 0; i < steps; i++) {
      const nx = target.x + (dx / len) * (distance / steps);
      const ny = target.y + (dy / len) * (distance / steps);
      if (this.blocked(level, nx, ny)) break;
      target.x = nx;
      target.y = ny;
    }
  }

  damage(target, amount, source, label, now = Date.now()) {
    if (!target.alive || now < target.invulnerableUntil || !source) return false;
    target.health -= amount;
    this.emit(target, 'hurt', { amount, by: source.name, with: label });
    this.emit(source, 'dealt', { amount, to: target.name, with: label });
    if (target.health <= 0) {
      target.health = 0;
      target.alive = false;
      target.deaths++;
      target.respawnAt = Date.now() + RESPAWN_DELAY_MS;
      source.kills++;
      this.dropAll(target);
      this.broadcast('death', { victim: target.name, killer: source.name });
    }
    return true;
  }

  doPickup(player, now) {
    const level = this.levels[player.level];
    // Caches can be opened from about a tile away (E or O); loose floor
    // items still need you standing right on top of them.
    for (const cache of level.caches) {
      if (cache.looted) continue;
      if (Math.hypot(cache.x - player.x, cache.y - player.y) > 1.1) continue;
      if (!this.giveItem(player, cache.item, now)) return;
      cache.looted = true;
      return;
    }
    const pile = this.groundItems.get(player.level);
    for (let i = 0; i < pile.length; i++) {
      const drop = pile[i];
      if (Math.hypot(drop.x - player.x, drop.y - player.y) > 0.9) continue;
      if (!this.giveItem(player, drop.item, now)) return;
      pile.splice(i, 1);
      return;
    }
  }

  giveItem(player, item, now) {
    if (item.kind === 'boon') {
      // Boons apply the moment you take them — the gamble resolves immediately.
      this.applyBoon(player, item);
      this.emit(player, 'boon', { name: item.name, attr: item.attr, delta: item.delta });
      return true;
    }
    const slot = player.inventory.findIndex((entry) => entry === null);
    if (slot === -1) {
      this.emit(player, 'full', { name: item.name });
      return false;
    }
    player.inventory[slot] = item;
    this.emit(player, 'pickup', { name: item.name, uid: item.uid, kind: item.kind, slot });
    // First spell you ever find becomes the prepared one.
    if (item.kind === 'spell' && !player.equippedSpellUid) player.equippedSpellUid = item.uid;
    return true;
  }

  applyBoon(player, item) {
    const range = CONFIG.player.clamp[item.attr];
    if (!range) {
      console.warn(`[boon] no clamp range configured for attr "${item.attr}" — skipping`);
      return;
    }
    player[item.attr] = clamp(Math.round((player[item.attr] + item.delta) * 10) / 10, range[0], range[1]);
    if (item.attr === 'maxHealth') player.health = Math.min(player.health, player.maxHealth);
    if (item.attr === 'maxMana') player.mana = Math.min(player.mana, player.maxMana);
  }

  doDrop(player, uid) {
    const i = player.inventory.findIndex((it) => it && it.uid === uid);
    if (i === -1) return;
    const item = player.inventory[i];
    player.inventory[i] = null;
    if (player.leftHandUid === uid) player.leftHandUid = null;
    if (player.rightHandUid === uid) player.rightHandUid = null;
    if (player.equippedSpellUid === uid) player.equippedSpellUid = null;
    this.groundItems.get(player.level).push({ uid: item.uid, x: player.x, y: player.y, item });
    this.emit(player, 'drop', { name: item.name });
  }

  dropAll(player) {
    const pile = this.groundItems.get(player.level);
    for (const item of player.inventory) {
      if (!item) continue;
      pile.push({
        uid: item.uid,
        x: player.x + (this.rng() - 0.5),
        y: player.y + (this.rng() - 0.5),
        item,
      });
    }
    player.inventory = Array(CONFIG.player.inventorySize).fill(null);
    player.leftHandUid = null;
    player.rightHandUid = null;
    player.equippedSpellUid = null;
    player.attackState = null;
  }

  // --- events -----------------------------------------------------------

  emit(player, kind, data) {
    this.events.push({ to: player.id, kind, ...data });
  }

  broadcast(kind, data) {
    this.events.push({ to: null, kind, ...data });
  }

  drainEvents(playerId) {
    return this.events.filter((e) => e.to === null || e.to === playerId);
  }

  clearEvents() {
    this.events = [];
  }

  // --- tick -------------------------------------------------------------

  tick(dt, now) {
    this.tickCount++;

    for (const player of this.players.values()) {
      if (!player.alive) {
        if (now >= player.respawnAt) this.respawn(player);
        continue;
      }
      this.resolveAttack(player, now);
      this.resolveCast(player, now);
      if (player.attackState && now >= player.attackState.endsAt) player.attackState = null;
      if (player.castState?.resolved) player.castState = null;
      this.movePlayer(player, dt, now);
      player.mana = Math.min(player.maxMana, player.mana + player.manaRegenPerSec * dt);

      // Vision is the expensive part; 5Hz is plenty for map reveal.
      if (!CONFIG.revealAll && this.tickCount % 4 === 0) this.updateVision(player);
    }
    this.updateProjectiles(dt, now);
  }

  // --- snapshots --------------------------------------------------------

  welcomeFor(player) {
    const level = this.levels[player.level];
    return {
      you: player.id,
      seed: this.seed,
      totalLevels: this.totalLevels,
      revealAll: CONFIG.revealAll,
      level: player.level,
      width: level.width,
      height: level.height,
      inventorySize: CONFIG.player.inventorySize,
      inventorySideSize: CONFIG.player.inventorySideSize,
    };
  }

  snapshotFor(player) {
    const level = this.levels[player.level];

    const others = [];
    for (const other of this.players.values()) {
      if (other === player || other.level !== player.level) continue;
      if (!this.canSee(player, other.x, other.y)) continue;
      others.push({
        id: other.id,
        name: other.name,
        x: round2(other.x),
        y: round2(other.y),
        aim: round2(other.aim),
        alive: other.alive,
        hp: Math.round((other.health / other.maxHealth) * 100),
        attack: publicAttack(other.attackState, Date.now()),
        cast: publicCast(other.castState, Date.now()),
      });
    }

    const caches = level.caches
      .filter((c) => !c.looted && player.explored.has(tileIndex(level, c.x, c.y)))
      .map((c) => ({ id: c.id, x: round2(c.x), y: round2(c.y) }));

    const drops = this.groundItems.get(player.level)
      .filter((d) => player.explored.has(tileIndex(level, d.x, d.y)))
      .map((d) => ({ uid: d.uid, x: round2(d.x), y: round2(d.y), name: d.item.name, kind: d.item.kind }));
    const projectiles = this.projectiles
      .filter((projectile) => projectile.level === player.level && this.canSee(player, projectile.x, projectile.y))
      .map(publicProjectile);

    // A player only needs sources close enough to become audible. Once the
    // browser learns a point it retains it, while the server remains the
    // authority for its fixed location and assigned clips.
    const soundPoints = level.soundPoints
      .filter((p) => Math.hypot(p.x - player.x, p.y - player.y) <= AMBIENT_MAX_DIST + 2)
      .map(publicSoundPoint);

    const now = Date.now();
    const snapshot = {
      t: now,
      self: {
        x: round2(player.x),
        y: round2(player.y),
        aim: round2(player.aim),
        level: player.level,
        health: Math.round(player.health),
        maxHealth: player.maxHealth,
        mana: Math.round(player.mana),
        maxMana: player.maxMana,
        speed: player.speed,
        manaRegenPerSec: player.manaRegenPerSec,
        alive: player.alive,
        respawnIn: player.alive ? 0 : Math.max(0, player.respawnAt - now),
        swapRemaining: Math.max(0, player.swapUntil - now),
        castRemaining: Math.max(0, player.castReadyAt - now),
        kills: player.kills,
        deaths: player.deaths,
        inventory: player.inventory.map((item) => item ? publicItem(item) : null),
        leftHandUid: player.leftHandUid,
        rightHandUid: player.rightHandUid,
        equippedSpellUid: player.equippedSpellUid,
        attack: publicAttack(player.attackState, now),
        cast: publicCast(player.castState, now),
        dodgeRemaining: Math.max(0, player.dodgeUntil - now),
        dodgeCooldownRemaining: Math.max(0, player.dodgeReadyAt - now),
      },
      others,
      caches,
      drops,
      projectiles,
      soundPoints,
      // flat [tileIndex, tileValue, ...] of everything revealed since last frame
      reveal: player.newlyExplored,
      events: this.drainEvents(player.id).map(({ to, ...rest }) => rest),
    };
    player.newlyExplored = [];
    return snapshot;
  }

  // --- DungeonMaster / spectator ----------------------------------------
  // The DM is an observer, not a combatant: no fog, no character, sees the
  // whole level and every player on it regardless of the `revealAll` test flag.

  dmWelcome(levelIndex = 0) {
    const level = this.levels[levelIndex] ?? this.levels[0];
    return {
      seed: this.seed,
      totalLevels: this.totalLevels,
      level: levelIndex,
      width: level.width,
      height: level.height,
      // sent once in full — the DM view never has fog to unfog
      tiles: Array.from(level.tiles),
      soundPoints: level.soundPoints.map(publicSoundPoint),
    };
  }

  dmSnapshot(levelIndex = 0) {
    const players = [];
    for (const p of this.players.values()) {
      if (p.level !== levelIndex) continue;
      players.push({
        id: p.id,
        name: p.name,
        x: round2(p.x),
        y: round2(p.y),
        aim: round2(p.aim),
        alive: p.alive,
        health: Math.round(p.health),
        maxHealth: p.maxHealth,
        kills: p.kills,
        deaths: p.deaths,
      });
    }

    const level = this.levels[levelIndex] ?? this.levels[0];
    const caches = level.caches
      .filter((c) => !c.looted)
      .map((c) => ({ id: c.id, x: round2(c.x), y: round2(c.y) }));

    const drops = this.groundItems.get(levelIndex).map((d) => ({
      uid: d.uid, x: round2(d.x), y: round2(d.y), name: d.item.name, kind: d.item.kind,
    }));
    const projectiles = this.projectiles
      .filter((projectile) => projectile.level === levelIndex)
      .map(publicProjectile);

    return { t: Date.now(), level: levelIndex, players, caches, drops, projectiles };
  }
}

function tileIndex(level, x, y) {
  return Math.floor(y) * level.width + Math.floor(x);
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function publicItem(item) {
  const out = { uid: item.uid, kind: item.kind, name: item.name };
  if (item.kind === 'weapon') Object.assign(out, {
    damage: item.damage, range: item.range, windupMs: item.windupMs,
    swingMs: item.swingMs, attackStyle: item.attackStyle, throwable: !!item.throwable,
  });
  if (item.kind === 'shield') Object.assign(out, {
    dodgeDistance: item.dodgeDistance, cooldownMs: item.cooldownMs,
  });
  if (item.kind === 'spell') Object.assign(out, {
    damage: item.damage, heal: item.heal, manaCost: item.manaCost,
    windupMs: item.windupMs, cooldownMs: item.cooldownMs,
    projectileStyle: item.projectileStyle,
  });
  return out;
}

function publicAttack(attack, now) {
  if (!attack) return null;
  const windupDuration = Math.max(1, attack.resolveAt - attack.startedAt);
  const recoveryDuration = Math.max(1, attack.endsAt - attack.resolveAt);
  const phase = attack.resolved ? 'release' : 'windup';
  const progress = phase === 'windup'
    ? clamp((now - attack.startedAt) / windupDuration, 0, 1)
    : clamp((now - attack.resolveAt) / recoveryDuration, 0, 1);
  return { hand: attack.hand, style: attack.style, phase, progress: round2(progress) };
}

function publicCast(cast, now) {
  if (!cast || cast.resolved) return null;
  const duration = Math.max(1, cast.resolveAt - cast.startedAt);
  return {
    style: cast.style,
    progress: round2(clamp((now - cast.startedAt) / duration, 0, 1)),
  };
}

function publicProjectile(projectile) {
  return {
    id: projectile.id,
    x: round2(projectile.x),
    y: round2(projectile.y),
    style: projectile.style,
    energy: round2(clamp(1 - (projectile.travelled / projectile.range) * 0.6, 0.4, 1)),
  };
}

function publicSoundPoint(point) {
  return {
    id: point.id,
    x: round2(point.x),
    y: round2(point.y),
    mode: point.mode,
    clips: point.clips.map((clip) => ({
      soundId: clip.soundId,
      x: round2(clip.x),
      y: round2(clip.y),
    })),
  };
}
