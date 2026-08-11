// Shared between server and browser client. Keep this file dependency-free.

export const TILE = {
  WALL: 0,
  FLOOR: 1,
  STAIRS_DOWN: 2,
  STAIRS_UP: 3,
};

export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;

// Player body radius in tile units. Corridors are 1 tile wide, so keep < 0.5.
export const PLAYER_RADIUS = 0.32;

// How far a player can see, in tiles. Drives fog-of-war reveal.
export const SIGHT_RADIUS = 8.5;

export const RESPAWN_DELAY_MS = 3000;

export const MSG = {
  // server -> client
  WELCOME: 'welcome',
  MAP: 'map',
  STATE: 'state',
  EVENT: 'event',
  // client -> server
  JOIN: 'join',
  INPUT: 'input',
  ACTION: 'action',
};

export const ACTION = {
  ATTACK: 'attack',
  CAST: 'cast',
  PICKUP: 'pickup',
  DROP: 'drop',
  EQUIP: 'equip',
  USE: 'use',
};
