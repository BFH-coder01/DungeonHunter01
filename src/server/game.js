// Authoritative game simulation. The browser sends intent only; every position,
// attribute and hit is decided here.

import { TILE, PLAYER_RADIUS, SIGHT_RADIUS, RESPAWN_DELAY_MS, ACTION } from '../shared/constants.js';
import { CONFIG } from '../shared/config.js';
import { makeRng, randomSeed } from '../shared/rng.js';
import { makeWeapon, makeSpell } from '../shared/items.js';
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
      inventory: [makeWeapon('rusted_dagger'), makeSpell('spark')],
      equippedWeaponUid: null,
      equippedSpellUid: null,
      swapUntil: 0,        // busy-until timestamp; you stand still to swap
      swingUntil: 0,
      castReadyAt: 0,
      alive: true,
      respawnAt: 0,
      kills: 0,
      deaths: 0,
      explored: new Set(), // tile indices this player has seen
      newlyExplored: [],   // drained into the next snapshot
      visible: new Set(),  // recomputed periodically
    };
    player.equippedWeaponUid = player.inventory[0].uid;
    player.equippedSpellUid = player.inventory[1].uid;

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
    const step = player.speed * dt;
    const nx = player.x + mx * step;
    const ny = player.y + my * step;

    if (!this.blocked(level, nx, player.y)) player.x = nx;
    if (!this.blocked(level, player.x, ny)) player.y = ny;
  }

  // --- actions ----------------------------------------------------------

  findItem(player, uid) {
    return player.inventory.find((it) => it.uid === uid) || null;
  }

  handleAction(player, msg, now) {
    if (!player.alive && msg.action !== ACTION.EQUIP) return;
    switch (msg.action) {
      case ACTION.ATTACK: return this.doAttack(player, now);
      case ACTION.CAST: return this.doCast(player, now);
      case ACTION.PICKUP: return this.doPickup(player, now);
      case ACTION.DROP: return this.doDrop(player, msg.uid);
      case ACTION.EQUIP: return this.doEquip(player, msg.uid, now);
      default: return undefined;
    }
  }

  doEquip(player, uid, now) {
    const item = this.findItem(player, uid);
    if (!item) return;
    if (item.kind === 'weapon') {
      if (uid === player.equippedWeaponUid) return;
      // Deliberate, interruptible-by-death swap. No instant hotkey weapons.
      player.swapUntil = now + CONFIG.player.weaponSwapMs;
      player.equippedWeaponUid = uid;
      this.emit(player, 'swap', { name: item.name, ms: CONFIG.player.weaponSwapMs });
    } else if (item.kind === 'spell') {
      // Spells are memorised, not held — switching is free and instant.
      player.equippedSpellUid = uid;
      this.emit(player, 'spell', { name: item.name });
    }
  }

  doAttack(player, now) {
    if (now < player.swapUntil || now < player.swingUntil) return;
    const weapon = this.findItem(player, player.equippedWeaponUid);
    if (!weapon) return;
    player.swingUntil = now + weapon.swingMs;
    const target = this.frontTarget(player, weapon.range, 0.7);
    if (target) this.damage(target, weapon.damage, player, weapon.name);
    this.emit(player, 'swing', { name: weapon.name, hit: !!target });
  }

  doCast(player, now) {
    if (now < player.castReadyAt) return;
    const spell = this.findItem(player, player.equippedSpellUid);
    if (!spell) return;
    if (player.mana < spell.manaCost) {
      this.emit(player, 'nomana', { name: spell.name, need: spell.manaCost });
      return;
    }
    player.mana -= spell.manaCost;
    player.castReadyAt = now + spell.cooldownMs;

    if (spell.heal) {
      player.health = Math.min(player.maxHealth, player.health + spell.heal);
      this.emit(player, 'cast', { name: spell.name, hit: true });
      return;
    }
    const target = this.frontTarget(player, spell.range, 0.85);
    if (target) this.damage(target, spell.damage, player, spell.name);
    this.emit(player, 'cast', { name: spell.name, hit: !!target });
  }

  // Nearest living player on this level inside `range` and roughly in front.
  frontTarget(player, range, minDot) {
    const ax = Math.cos(player.aim);
    const ay = Math.sin(player.aim);
    let best = null;
    let bestDist = Infinity;
    for (const other of this.players.values()) {
      if (other === player || !other.alive || other.level !== player.level) continue;
      const dx = other.x - player.x;
      const dy = other.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > range + PLAYER_RADIUS || d < 0.001) continue;
      if ((dx / d) * ax + (dy / d) * ay < minDot) continue;
      if (!this.hasLineOfSight(this.levels[player.level], player.x, player.y, other.x, other.y)) continue;
      if (d < bestDist) { best = other; bestDist = d; }
    }
    return best;
  }

  damage(target, amount, source, label) {
    if (!target.alive) return;
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
  }

  doPickup(player, now) {
    const level = this.levels[player.level];
    // Caches can be opened from about a tile away (E or O); loose floor
    // items still need you standing right on top of them.
    for (const cache of level.caches) {
      if (cache.looted) continue;
      if (Math.hypot(cache.x - player.x, cache.y - player.y) > 1.1) continue;
      cache.looted = true;
      this.giveItem(player, cache.item, now);
      return;
    }
    const pile = this.groundItems.get(player.level);
    for (let i = 0; i < pile.length; i++) {
      const drop = pile[i];
      if (Math.hypot(drop.x - player.x, drop.y - player.y) > 0.9) continue;
      pile.splice(i, 1);
      this.giveItem(player, drop.item, now);
      return;
    }
  }

  giveItem(player, item, now) {
    if (item.kind === 'boon') {
      // Boons apply the moment you take them — the gamble resolves immediately.
      this.applyBoon(player, item);
      this.emit(player, 'boon', { name: item.name, attr: item.attr, delta: item.delta });
      return;
    }
    if (player.inventory.length >= CONFIG.player.inventorySize) {
      this.emit(player, 'full', { name: item.name });
      return;
    }
    player.inventory.push(item);
    this.emit(player, 'pickup', { name: item.name, uid: item.uid, kind: item.kind });
    // First spell you ever find becomes the prepared one.
    if (item.kind === 'spell' && !player.equippedSpellUid) player.equippedSpellUid = item.uid;
  }

  applyBoon(player, item) {
    const range = CONFIG.player.clamp[item.attr];
    player[item.attr] = clamp(Math.round((player[item.attr] + item.delta) * 10) / 10, range[0], range[1]);
    if (item.attr === 'maxHealth') player.health = Math.min(player.health, player.maxHealth);
    if (item.attr === 'maxMana') player.mana = Math.min(player.mana, player.maxMana);
  }

  doDrop(player, uid) {
    const i = player.inventory.findIndex((it) => it.uid === uid);
    if (i === -1) return;
    const [item] = player.inventory.splice(i, 1);
    if (player.equippedWeaponUid === uid) player.equippedWeaponUid = null;
    if (player.equippedSpellUid === uid) player.equippedSpellUid = null;
    this.groundItems.get(player.level).push({ uid: item.uid, x: player.x, y: player.y, item });
    this.emit(player, 'drop', { name: item.name });
  }

  dropAll(player) {
    const pile = this.groundItems.get(player.level);
    for (const item of player.inventory) {
      pile.push({
        uid: item.uid,
        x: player.x + (this.rng() - 0.5),
        y: player.y + (this.rng() - 0.5),
        item,
      });
    }
    player.inventory = [];
    player.equippedWeaponUid = null;
    player.equippedSpellUid = null;
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

  // --- tick -------------------------------------------------------------

  tick(dt, now) {
    this.tickCount++;
    this.events = [];

    for (const player of this.players.values()) {
      if (!player.alive) {
        if (now >= player.respawnAt) this.respawn(player);
        continue;
      }
      this.movePlayer(player, dt, now);
      player.mana = Math.min(player.maxMana, player.mana + player.manaRegenPerSec * dt);

      // Vision is the expensive part; 5Hz is plenty for map reveal.
      if (!CONFIG.revealAll && this.tickCount % 4 === 0) this.updateVision(player);
    }
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
    };
  }

  snapshotFor(player) {
    const level = this.levels[player.level];

    const others = [];
    for (const other of this.players.values()) {
      if (other === player || other.level !== player.level) continue;
      if (!other.alive) continue;
      if (!this.canSee(player, other.x, other.y)) continue;
      others.push({
        id: other.id,
        name: other.name,
        x: round2(other.x),
        y: round2(other.y),
        aim: round2(other.aim),
        hp: Math.round((other.health / other.maxHealth) * 100),
      });
    }

    const caches = level.caches
      .filter((c) => !c.looted && player.explored.has(tileIndex(level, c.x, c.y)))
      .map((c) => ({ id: c.id, x: round2(c.x), y: round2(c.y) }));

    const drops = this.groundItems.get(player.level)
      .filter((d) => player.explored.has(tileIndex(level, d.x, d.y)))
      .map((d) => ({ uid: d.uid, x: round2(d.x), y: round2(d.y), name: d.item.name, kind: d.item.kind }));

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
        inventory: player.inventory.map(publicItem),
        equippedWeaponUid: player.equippedWeaponUid,
        equippedSpellUid: player.equippedSpellUid,
      },
      others,
      caches,
      drops,
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

    return { t: Date.now(), level: levelIndex, players, caches, drops };
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
  if (item.kind === 'weapon') Object.assign(out, { damage: item.damage, range: item.range, swingMs: item.swingMs });
  if (item.kind === 'spell') Object.assign(out, { damage: item.damage, heal: item.heal, manaCost: item.manaCost, cooldownMs: item.cooldownMs });
  return out;
}
