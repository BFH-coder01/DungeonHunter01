// Procedural dungeon generation: rooms scattered by rejection sampling, then
// connected with L-shaped corridors in a chain plus a few extra loops so the
// map isn't a pure tree.

import { TILE } from '../shared/constants.js';
import { CONFIG } from '../shared/config.js';
import { rollCacheItem } from '../shared/items.js';

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

  const spawnCount = Math.max(4, Math.round(roomCount * CONFIG.dungeon.spawnPointsPerRoom));
  level.spawnPoints = pickSpread(open, spawnCount, CONFIG.dungeon.minSpawnSeparation, rng)
    .map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));

  const takenKeys = new Set(level.spawnPoints.map((p) => `${Math.floor(p.x)},${Math.floor(p.y)}`));
  const cacheCandidates = open.filter((p) => !takenKeys.has(`${p.x},${p.y}`));
  const cacheCount = Math.max(3, Math.round(roomCount * CONFIG.dungeon.cachesPerRoom));
  level.caches = pickSpread(cacheCandidates, cacheCount, 4, rng).map((p, i) => ({
    id: `c${depth}_${i}`,
    x: p.x + 0.5,
    y: p.y + 0.5,
    item: rollCacheItem(rng),
    looted: false,
  }));

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
