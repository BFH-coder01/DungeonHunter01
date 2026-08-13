import test from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/server/game.js';
import { ACTION, TILE } from '../src/shared/constants.js';
import { makeShield, makeWeapon } from '../src/shared/items.js';
import { consumeRateLimit } from '../src/server/rate-limit.js';
import { tileAt } from '../src/server/dungeon.js';
import { ambientPointCount } from '../src/shared/sounds.js';
import { CONFIG } from '../src/shared/config.js';

function playerGame(seed = 12345) {
  const game = new Game(seed);
  const player = game.addPlayer('test-player', 'Tester');
  player.move = { x: 0, y: 0 };
  return { game, player };
}

function faceAdjacentWall(game, player) {
  const level = game.levels[player.level];
  const directions = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
  ];
  for (let y = 1; y < level.height - 1; y++) {
    for (let x = 1; x < level.width - 1; x++) {
      if (tileAt(level, x, y) !== TILE.FLOOR) continue;
      const direction = directions.find(({ dx, dy }) => tileAt(level, x + dx, y + dy) === TILE.WALL);
      if (!direction) continue;
      player.x = x + 0.5;
      player.y = y + 0.5;
      player.aim = Math.atan2(direction.dy, direction.dx);
      return;
    }
  }
  throw new Error('Generated level has no floor tile beside a wall');
}

test('one attack spends stamina once and ignores spam during recovery', () => {
  const { game, player } = playerGame();
  const now = 10_000;

  game.handleAction(player, { action: ACTION.ATTACK, hand: 'left' }, now);
  assert.equal(player.stamina, 88);
  assert.equal(player.attackState.name, 'Rusted Dagger');
  assert.equal(game.movementScale(player, now + 50), 0.85);
  assert.equal(game.movementScale(player, player.attackState.resolveAt + 1), 0.9);

  game.handleAction(player, { action: ACTION.ATTACK, hand: 'left' }, now + 1);
  assert.equal(player.stamina, 88);
  assert.equal(game.movementScale(player, player.attackState.endsAt + 1), 1);
});

test('casting blocks attacks until the cast resolves', () => {
  const { game, player } = playerGame(23456);
  const now = 20_000;

  game.handleAction(player, { action: ACTION.CAST }, now);
  assert.ok(player.castState);
  assert.equal(game.movementScale(player, now + 1), 0.4);

  game.handleAction(player, { action: ACTION.ATTACK, hand: 'left' }, now + 1);
  assert.equal(player.attackState, null);
  assert.equal(player.stamina, 92);
});

test('dodge spends stamina and blocks other combat actions', () => {
  const { game, player } = playerGame(34567);
  const shield = makeShield('iron_buckler');
  player.inventory[4] = shield;
  player.rightHandUid = shield.uid;
  const now = 30_000;

  game.handleAction(player, { action: ACTION.ATTACK, hand: 'right' }, now);
  assert.equal(player.stamina, 65);
  assert.equal(game.movementScale(player, now + 1), 0);

  game.handleAction(player, { action: ACTION.ATTACK, hand: 'left' }, now + 1);
  assert.equal(player.attackState, null);
  assert.equal(player.stamina, 65);
});

test('stamina regenerates only after its delay and active action finish', () => {
  const { game, player } = playerGame(45678);
  const now = 40_000;
  game.handleAction(player, { action: ACTION.ATTACK, hand: 'left' }, now);

  game.tick(0.5, now + 500);
  assert.equal(player.stamina, 88);

  game.tick(0.5, now + CONFIG.player.staminaRegenDelayMs + 1);
  assert.equal(player.stamina, 93);
});

test('equipment loses durability on a wall strike and breaks at zero', () => {
  const { game, player } = playerGame(11223);
  const weapon = player.inventory[0];
  weapon.durability = 1;
  const now = 45_000;
  faceAdjacentWall(game, player);

  game.handleAction(player, { action: ACTION.ATTACK, hand: 'left' }, now);
  game.tick(0, player.attackState.resolveAt);

  assert.equal(game.findItem(player, weapon.uid), null);
  assert.equal(player.leftHandUid, null);
  assert.ok(game.drainEvents(player.id).some((event) => event.kind === 'broken' && event.name === weapon.name));
});

test('a missed weapon swing does not consume durability', () => {
  const { game, player } = playerGame(11334);
  const weapon = player.inventory[0];
  const before = weapon.durability;
  game.frontTargets = () => [];
  game.attackHitsWall = () => false;
  const now = 46_000;

  game.handleAction(player, { action: ACTION.ATTACK, hand: 'left' }, now);
  game.tick(0, player.attackState.resolveAt);

  assert.equal(weapon.durability, before);
});

test('each movement cycle drains stamina and release allows slower recovery', () => {
  const { game, player } = playerGame(11445);
  const now = 48_000;
  game.blocked = () => false;
  player.move = { x: 1, y: 0 };

  const beforeMove = player.x;
  game.tick(0.5, now);
  assert.equal(player.moving, true);
  assert.equal(player.stamina, 93);
  assert.ok(Math.abs(player.x - beforeMove - player.speed * CONFIG.player.movementSpeedScale * 0.5) < 0.001);

  player.move = { x: 0, y: 0 };
  game.tick(0, now + 50);
  game.tick(0.5, now + CONFIG.player.staminaRegenDelayMs + 50);
  assert.equal(player.moving, false);
  assert.equal(player.stamina, 98);
});

test('movement intent prevents regeneration until all direction keys release', () => {
  const { game, player } = playerGame(11556);
  const now = 49_000;
  player.stamina = 50;
  player.move = { x: 1, y: 0 };
  game.blocked = () => true;

  game.tick(1, now);
  game.tick(1, now + CONFIG.player.staminaRegenDelayMs + 1);
  assert.equal(player.stamina, 50);

  player.move = { x: 0, y: 0 };
  game.tick(0, now + CONFIG.player.staminaRegenDelayMs + 2);
  game.tick(1, now + CONFIG.player.staminaRegenDelayMs * 2 + 2);
  assert.equal(player.stamina, 60);
});

test('a spell disappears after its final configured cast', () => {
  const { game, player } = playerGame(22334);
  const spell = player.inventory[1];
  spell.castsRemaining = 1;
  const now = 47_000;

  game.handleAction(player, { action: ACTION.CAST }, now);
  game.tick(0, player.castState.resolveAt);

  assert.equal(game.findItem(player, spell.uid), null);
  assert.equal(player.equippedSpellUid, null);
  assert.ok(game.drainEvents(player.id).some((event) => event.kind === 'expired' && event.reason === 'casts'));
});

test('dropping a cache reward does not reset expiry and its chest relocates', () => {
  const { game, player } = playerGame(33445);
  const level = game.levels[0];
  const cache = level.caches[0];
  cache.item = makeWeapon('short_sword');
  const original = { x: cache.x, y: cache.y };
  const now = 49_000;
  player.x = cache.x;
  player.y = cache.y;

  game.handleAction(player, { action: ACTION.PICKUP }, now);
  const reward = game.findItem(player, cache.rewardUid);
  assert.ok(reward);
  assert.equal(reward.sourceCacheId, cache.id);
  assert.equal(reward.expiresAt, now + CONFIG.rewards.equipmentLifetimeMs);

  game.handleAction(player, { action: ACTION.DROP, uid: reward.uid }, now + 1);
  const drop = game.groundItems.get(0).find((entry) => entry.uid === reward.uid);
  assert.equal(drop.item.expiresAt, reward.expiresAt);
  assert.equal(cache.looted, true);
  assert.equal(cache.respawnAt, 0);

  game.tick(0, reward.expiresAt);
  assert.equal(game.groundItems.get(0).some((entry) => entry.uid === reward.uid), false);
  assert.ok(cache.respawnAt > reward.expiresAt);

  game.tick(0, cache.respawnAt);
  assert.equal(cache.looted, false);
  assert.ok(cache.item);
  assert.notEqual(cache.item.uid, reward.uid);
  assert.ok(Math.hypot(cache.x - original.x, cache.y - original.y) >= CONFIG.rewards.cacheMinRelocationDistance);
});

test('token bucket drops floods and refills over time', () => {
  const store = Object.create(null);
  const now = 50_000;
  for (let i = 0; i < 5; i++) assert.equal(consumeRateLimit(store, 'action', 10, 5, now), true);
  assert.equal(consumeRateLimit(store, 'action', 10, 5, now), false);
  assert.equal(consumeRateLimit(store, 'action', 10, 5, now + 100), true);
});

test('crossing a battle portal gathers every living player into one room', () => {
  const game = new Game(56789);
  const trigger = game.addPlayer('trigger', 'Trigger');
  const opponent = game.addPlayer('opponent', 'Opponent');
  const level = game.levels[0];
  const now = 60_000;

  trigger.x = level.battlePortal.x;
  trigger.y = level.battlePortal.y;
  opponent.x = level.spawnPoints[0].x;
  opponent.y = level.spawnPoints[0].y;
  game.tick(0, now);

  for (const player of [trigger, opponent]) {
    assert.ok(player.x > level.battleRoom.x && player.x < level.battleRoom.x + level.battleRoom.w);
    assert.ok(player.y > level.battleRoom.y && player.y < level.battleRoom.y + level.battleRoom.h);
  }
  assert.notDeepEqual({ x: trigger.x, y: trigger.y }, { x: opponent.x, y: opponent.y });
  assert.ok(level.battlePortal.cooldownUntil > now);
  assert.ok(game.drainEvents(trigger.id).some((event) => event.kind === 'battleportal' && event.fighters === 2));
});

test('battle portal cannot retrigger during its cooldown', () => {
  const { game, player } = playerGame(67890);
  const portal = game.levels[0].battlePortal;
  const now = 70_000;
  player.x = portal.x;
  player.y = portal.y;
  game.tick(0, now);
  const firstDestination = { x: player.x, y: player.y };

  player.portalInside = false;
  player.x = portal.x;
  player.y = portal.y;
  game.tick(0, now + 100);
  assert.deepEqual({ x: player.x, y: player.y }, { x: portal.x, y: portal.y });
  assert.notDeepEqual(firstDestination, { x: portal.x, y: portal.y });
});

test('battle portal placement is seeded, random across dungeons, and outside the arena', () => {
  const first = new Game(11111).levels[0];
  const repeat = new Game(11111).levels[0];
  assert.deepEqual(first.battlePortal, repeat.battlePortal);

  const positions = new Set();
  for (const seed of [11111, 22222, 33333, 44444, 55555]) {
    const level = new Game(seed).levels[0];
    const portal = level.battlePortal;
    positions.add(`${portal.x},${portal.y}`);
    assert.notEqual(tileAt(level, Math.floor(portal.x), Math.floor(portal.y)), TILE.WALL);
    const insideBattleRoom = portal.x > level.battleRoom.x &&
      portal.x < level.battleRoom.x + level.battleRoom.w &&
      portal.y > level.battleRoom.y &&
      portal.y < level.battleRoom.y + level.battleRoom.h;
    assert.equal(insideBattleRoom, false);
    const centerDistance = Math.hypot(portal.x - level.width / 2, portal.y - level.height / 2);
    assert.ok(centerDistance >= Math.min(level.width, level.height) * CONFIG.combat.battlePortalMinCenterDistanceRatio);
  }
  assert.ok(positions.size > 1);
});

test('green, blue, and yellow portals form distant one-to-one pairs', () => {
  const level = new Game(77777).levels[0];
  assert.equal(level.linkPortals.length, 6);
  for (const color of ['green', 'blue', 'yellow']) {
    const pair = level.linkPortals.filter((portal) => portal.color === color);
    assert.equal(pair.length, 2);
    assert.equal(pair[0].toId, pair[1].id);
    assert.equal(pair[1].toId, pair[0].id);
    assert.ok(Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) > 30);
    for (const portal of pair) {
      assert.notEqual(tileAt(level, Math.floor(portal.x), Math.floor(portal.y)), TILE.WALL);
    }
  }
});

test('a link portal waits for exit and then supports the return trip', () => {
  const { game, player } = playerGame(88888);
  const [source] = game.levels[0].linkPortals.filter((portal) => portal.color === 'blue');
  const destination = game.levels[0].linkPortals.find((portal) => portal.id === source.toId);
  const now = 80_000;

  player.x = source.x;
  player.y = source.y;
  game.tick(0, now);
  assert.deepEqual({ x: player.x, y: player.y }, { x: destination.x, y: destination.y });
  assert.equal(player.linkPortalLock, destination.id);

  game.tick(0, now + 1);
  assert.deepEqual({ x: player.x, y: player.y }, { x: destination.x, y: destination.y });

  player.x = destination.x + 1;
  game.tick(0, now + 2);
  assert.equal(player.linkPortalLock, null);
  player.x = destination.x;
  player.y = destination.y;
  game.tick(0, now + 3);
  assert.deepEqual({ x: player.x, y: player.y }, { x: source.x, y: source.y });
});

test('every player snapshot receives every portal regardless of exploration', () => {
  const { game, player } = playerGame(99999);
  player.explored.clear();
  const snapshot = game.snapshotFor(player);
  assert.ok(snapshot.battlePortal);
  assert.equal(snapshot.linkPortals.length, 6);
});

test('unchanged cache and drop collections can be omitted from state deltas', () => {
  const { game, player } = playerGame(100001);
  const playerDelta = game.snapshotFor(player, false);
  const dmDelta = game.dmSnapshot(0, false);
  assert.equal(Object.hasOwn(playerDelta, 'caches'), false);
  assert.equal(Object.hasOwn(playerDelta, 'drops'), false);
  assert.equal(Object.hasOwn(dmDelta, 'caches'), false);
  assert.equal(Object.hasOwn(dmDelta, 'drops'), false);
});

test('cache pickup and floor drop advance the static entity revision', () => {
  const { game, player } = playerGame(100002);
  const cache = game.levels[0].caches[0];
  cache.item = makeWeapon('short_sword');
  player.x = cache.x;
  player.y = cache.y;
  const beforePickup = game.entityRevision(0);

  game.handleAction(player, { action: ACTION.PICKUP }, 90_000);
  assert.equal(game.entityRevision(0), beforePickup + 1);

  const reward = player.inventory.find((item) => item?.sourceCacheId === cache.id);
  assert.ok(reward);
  game.handleAction(player, { action: ACTION.DROP, uid: reward.uid }, 90_001);
  assert.equal(game.entityRevision(0), beforePickup + 2);
});

test('ambient sound points scale with map dimensions and cover spawn regions', () => {
  assert.equal(ambientPointCount(64, 44), 12);
  assert.equal(ambientPointCount(192, 132), 45);
  assert.equal(ambientPointCount(384, 264), 90);

  const level = new Game(101010).levels[0];
  assert.equal(level.soundPoints.length, 45);
  let nearest = Infinity;
  for (let i = 0; i < level.soundPoints.length; i++) {
    for (let j = i + 1; j < level.soundPoints.length; j++) {
      nearest = Math.min(nearest, Math.hypot(
        level.soundPoints[i].x - level.soundPoints[j].x,
        level.soundPoints[i].y - level.soundPoints[j].y,
      ));
    }
  }
  assert.ok(nearest >= 15);
  const farthestSpawn = Math.max(...level.spawnPoints.map((spawn) =>
    Math.min(...level.soundPoints.map((point) => Math.hypot(point.x - spawn.x, point.y - spawn.y)))));
  assert.ok(farthestSpawn <= 22);
});

test('large test maps use many short corridors without becoming open fields', () => {
  for (const seed of [11111, 22222, 33333]) {
    const level = new Game(seed).levels[0];
    const expectedMinimum = (level.rooms.length - 1) +
      Math.floor(level.rooms.length * CONFIG.dungeon.extraCorridorsPerRoom);
    const walkable = [...level.tiles].filter((tile) => tile !== TILE.WALL).length;
    assert.ok(level.corridorConnections >= expectedMinimum);
    assert.ok(walkable / level.tiles.length >= 0.40);
    assert.ok(walkable / level.tiles.length <= 0.50);
  }
});
