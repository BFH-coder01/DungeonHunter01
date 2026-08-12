// Procedural dungeon generation: rooms scattered by rejection sampling, then
// connected with L-shaped corridors in a chain plus a few extra loops so the
// map isn't a pure tree.

import { TILE } from '../shared/constants.js';
import { CONFIG } from '../shared/config.js';
import { makeShield, rollCacheItem } from '../shared/items.js';
import { ambientPointCount, AMBIENT_SOUNDS } from '../shared/sounds.js';

const idx = (level, x, y) => y * level.width + x;

export function tileAt(level, x, y) {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return TILE.WALL;
  return level.tiles[idx(level, x, y)];
}

export function isWalkable(level, x, y) {
  return tileAt(level, x, y) !== TILE.WALL;
}

function carveRoom(level, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      level.tiles[idx(level, x, y)] = TILE.FLOOR;
    }
  }
}

function carveHLine(level, x0, x1, y) {
  const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
  for (let x = a; x <= b; x++) level.tiles[idx(level, x, y)] = TILE.FLOOR;
}

function carveVLine(level, y0, y1, x) {
  const [a, b] = y0 < y1 ? [y0, y1] : [y1, y0];
  for (let y = a; y <= b; y++) level.tiles[idx(level, x, y)] = TILE.FLOOR;
}

function connect(level, a, b, rng) {
  const ax = Math.floor(a.x + a.w / 2);
  const ay = Math.floor(a.y + a.h / 2);
  const bx = Math.floor(b.x + b.w / 2);
  const by = Math.floor(b.y + b.h / 2);
  if (rng.chance(0.5)) {
    carveHLine(level, ax, bx, ay);
    carveVLine(level, ay, by, bx);
  } else {
    carveVLine(level, ay, by, ax);
    carveHLine(level, ax, bx, by);
  }
}

function overlaps(room, others) {
  // 1-tile gap so rooms keep their walls
  return others.some((o) =>
    room.x - 1 < o.x + o.w &&
    room.x + room.w + 1 > o.x &&
    room.y - 1 < o.y + o.h &&
    room.y + room.h + 1 > o.y);
}

function placeRooms(level, rng) {
  const { roomAttempts, roomMin, roomMax } = CONFIG.dungeon;
  const rooms = [];
  for (let i = 0; i < roomAttempts; i++) {
    const w = rng.int(roomMin, roomMax);
    const h = rng.int(roomMin, roomMax);
    const x = rng.int(1, level.width - w - 2);
    const y = rng.int(1, level.height - h - 2);
    const room = { x, y, w, h };
    if (overlaps(room, rooms)) continue;
    rooms.push(room);
    carveRoom(level, room);
  }
  return rooms;
}

// Floor tiles that aren't jammed into a corner — nicer place to stand.
function openFloorTiles(level) {
  const out = [];
  for (let y = 1; y < level.height - 1; y++) {
    for (let x = 1; x < level.width - 1; x++) {
      if (tileAt(level, x, y) === TILE.WALL) continue;
      let open = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (tileAt(level, x + dx, y + dy) !== TILE.WALL) open++;
        }
      }
      if (open >= 6) out.push({ x, y });
    }
  }
  return out;
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function pickSpread(candidates, count, minSeparation, rng) {
  const chosen = [];
  const pool = rng.shuffle(candidates.slice());
  const minSq = minSeparation * minSeparation;
  for (const c of pool) {
    if (chosen.length >= count) break;
    if (chosen.every((p) => dist2(p, c) >= minSq)) chosen.push(c);
  }
  // If the map was too cramped to honour the separation, top up loosely.
  for (const c of pool) {
    if (chosen.length >= count) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  return chosen;
}

function pickCoverage(candidates, count, rng) {
  if (!candidates.length || count <= 0) return [];
  const chosen = [rng.pick(candidates)];
  const remaining = candidates.filter((candidate) => candidate !== chosen[0]);
  while (chosen.length < count && remaining.length) {
    let bestIndex = 0;
    let bestNearestSq = -1;
    for (let i = 0; i < remaining.length; i++) {
      let nearestSq = Infinity;
      for (const point of chosen) nearestSq = Math.min(nearestSq, dist2(point, remaining[i]));
      if (nearestSq > bestNearestSq) { bestNearestSq = nearestSq; bestIndex = i; }
    }
    chosen.push(remaining.splice(bestIndex, 1)[0]);
  }
  return chosen;
}

function generateLevel(depth, totalLevels, rng) {
  const { width, height } = CONFIG.dungeon;
  const level = {
    depth,
    width,
    height,
    tiles: new Uint8Array(width * height).fill(TILE.WALL),
    rooms: [],
    spawnPoints: [],
    caches: [],
    soundPoints: [],
    battlePortal: null,
    battleRoom: null,
    battleSpawns: [],
    linkPortals: [],
    stairsDown: null,
    stairsUp: null,
  };

  level.rooms = placeRooms(level, rng);

  // Chain every room, then add a few extra edges so there are loops to run.
  for (let i = 1; i < level.rooms.length; i++) {
    connect(level, level.rooms[i - 1], level.rooms[i], rng);
  }
  const extras = Math.floor(level.rooms.length * 0.25);
  for (let i = 0; i < extras; i++) {
    const a = rng.pick(level.rooms);
    const b = rng.pick(level.rooms);
    if (a !== b) connect(level, a, b, rng);
  }

  const open = openFloorTiles(level);
  const roomCount = Math.max(1, level.rooms.length);

  // The largest room becomes the battle destination. The portal uses the
  // seeded dungeon RNG to choose a valid floor tile outside both that room and
  // the central map zone, so every client agrees while each new dungeon moves
  // the portal around the map's broad outer area.
  const roomCenter = (room) => ({ x: room.x + room.w / 2, y: room.y + room.h / 2 });
  const battleRoom = level.rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (battleRoom) {
    const battleCenter = roomCenter(battleRoom);
    const mapCenter = { x: level.width / 2, y: level.height / 2 };
    const minCenterDistance = Math.min(level.width, level.height) * CONFIG.combat.battlePortalMinCenterDistanceRatio;
    const outsideBattleRoom = (point) => !(
      point.x >= battleRoom.x && point.x < battleRoom.x + battleRoom.w &&
      point.y >= battleRoom.y && point.y < battleRoom.y + battleRoom.h
    );
    const outerPortalCandidates = open.filter((point) =>
      outsideBattleRoom(point) && Math.hypot(point.x + 0.5 - mapCenter.x, point.y + 0.5 - mapCenter.y) >= minCenterDistance);
    const fallbackPortalCandidates = open.filter(outsideBattleRoom);
    const portalSpot = rng.pick(outerPortalCandidates.length ? outerPortalCandidates : fallbackPortalCandidates);
    level.battleRoom = { ...battleRoom };
    level.battlePortal = {
      id: `bp${depth}`,
      x: portalSpot.x + 0.5,
      y: portalSpot.y + 0.5,
      cooldownUntil: 0,
    };
    for (let y = battleRoom.y + 1; y < battleRoom.y + battleRoom.h - 1; y++) {
      for (let x = battleRoom.x + 1; x < battleRoom.x + battleRoom.w - 1; x++) {
        level.battleSpawns.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
    level.battleSpawns.sort((a, b) => dist2(b, battleCenter) - dist2(a, battleCenter));

    // Green, blue, and yellow each form a one-to-one bidirectional link. The
    // first room in each pair is seeded-random; its mate is the farthest
    // remaining room so the link meaningfully crosses the large map.
    const redPortalRoom = level.rooms.find((room) =>
      level.battlePortal.x > room.x && level.battlePortal.x < room.x + room.w &&
      level.battlePortal.y > room.y && level.battlePortal.y < room.y + room.h);
    const availableRooms = level.rooms.filter((room) => room !== battleRoom && room !== redPortalRoom);
    for (const color of ['green', 'blue', 'yellow']) {
      if (availableRooms.length < 2) break;
      const firstIndex = rng.int(0, availableRooms.length - 1);
      const firstRoom = availableRooms.splice(firstIndex, 1)[0];
      const firstCenter = roomCenter(firstRoom);
      let secondIndex = 0;
      for (let i = 1; i < availableRooms.length; i++) {
        if (dist2(roomCenter(availableRooms[i]), firstCenter) > dist2(roomCenter(availableRooms[secondIndex]), firstCenter)) {
          secondIndex = i;
        }
      }
      const secondRoom = availableRooms.splice(secondIndex, 1)[0];
      const a = {
        id: `lp_${color}_a`, pairId: color, color,
        x: rng.int(firstRoom.x + 1, firstRoom.x + firstRoom.w - 2) + 0.5,
        y: rng.int(firstRoom.y + 1, firstRoom.y + firstRoom.h - 2) + 0.5,
        toId: `lp_${color}_b`,
      };
      const b = {
        id: `lp_${color}_b`, pairId: color, color,
        x: rng.int(secondRoom.x + 1, secondRoom.x + secondRoom.w - 2) + 0.5,
        y: rng.int(secondRoom.y + 1, secondRoom.y + secondRoom.h - 2) + 0.5,
        toId: `lp_${color}_a`,
      };
      level.linkPortals.push(a, b);
    }
  }

  const spawnCount = Math.max(4, Math.round(roomCount * CONFIG.dungeon.spawnPointsPerRoom));
  level.spawnPoints = pickSpread(open, spawnCount, CONFIG.dungeon.minSpawnSeparation, rng)
    .map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));

  const takenKeys = new Set(level.spawnPoints.map((p) => `${Math.floor(p.x)},${Math.floor(p.y)}`));
  if (level.battlePortal) takenKeys.add(`${Math.floor(level.battlePortal.x)},${Math.floor(level.battlePortal.y)}`);
  for (const portal of level.linkPortals) takenKeys.add(`${Math.floor(portal.x)},${Math.floor(portal.y)}`);
  const cacheCandidates = open.filter((p) => !takenKeys.has(`${p.x},${p.y}`));
  const cacheCount = Math.max(3, Math.round(roomCount * CONFIG.dungeon.cachesPerRoom));
  level.caches = pickSpread(cacheCandidates, cacheCount, 4, rng).map((p, i) => ({
    id: `c${depth}_${i}`,
    x: p.x + 0.5,
    y: p.y + 0.5,
    item: rollCacheItem(rng),
    looted: false,
  }));
  // Dodge is a cache-earned mechanic, but every generated level must contain
  // at least one shield so the mechanic is always discoverable and testable.
  if (level.caches.length && !level.caches.some((cache) => cache.item.kind === 'shield')) {
    level.caches[rng.int(0, level.caches.length - 1)].item = makeShield('iron_buckler');
  }

  // Ambient sources are authoritative seeded dungeon entities, like caches.
  const soundPointCount = ambientPointCount(level.width, level.height);
  const soundSpots = pickCoverage(open, soundPointCount, rng);
  level.soundPoints = soundSpots.map((p, i) => {
    const roll = rng();
    const count = roll < 0.55 ? 1 : roll < 0.85 ? 2 : 3;
    const sounds = rng.shuffle(AMBIENT_SOUNDS.slice()).slice(0, count);
    const mode = count > 1 && rng.chance(0.5) ? 'group' : 'individual';
    const x = p.x + 0.5;
    const y = p.y + 0.5;
    const clips = sounds.map((sound) => ({
      soundId: sound.id,
      x: mode === 'group' ? x : x + rng.float(-0.35, 0.35),
      y: mode === 'group' ? y : y + rng.float(-0.35, 0.35),
    }));
    return { id: `s${depth}_${i}`, x, y, mode, clips };
  });

  // Stairs, when there is more than one level to move between.
  const stairCandidates = pickSpread(open, 2, 12, rng);
  if (depth > 0 && stairCandidates[0]) {
    level.stairsUp = { x: stairCandidates[0].x + 0.5, y: stairCandidates[0].y + 0.5 };
    level.tiles[idx(level, stairCandidates[0].x, stairCandidates[0].y)] = TILE.STAIRS_UP;
  }
  if (depth < totalLevels - 1 && stairCandidates[1]) {
    level.stairsDown = { x: stairCandidates[1].x + 0.5, y: stairCandidates[1].y + 0.5 };
    level.tiles[idx(level, stairCandidates[1].x, stairCandidates[1].y)] = TILE.STAIRS_DOWN;
  }

  return level;
}

export function generateDungeon(rng) {
  const { fixed, min, max } = CONFIG.levels;
  const totalLevels = fixed ?? rng.int(min, max);
  const levels = [];
  for (let d = 0; d < totalLevels; d++) {
    levels.push(generateLevel(d, totalLevels, rng));
  }
  return { levels, totalLevels };
}
