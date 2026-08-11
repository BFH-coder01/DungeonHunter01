// v01 tuning knobs. Everything the test harness needs to flip lives here.

export const CONFIG = {
  // --- test scaffolding -------------------------------------------------
  // v01 test target: ONE level, whole dungeon visible from the moment you join.
  // Set levels.fixed to null to get the real behaviour (random 1..10 levels),
  // and revealAll to false to turn fog-of-war back on.
  revealAll: true,
  levels: {
    fixed: 1,
    min: 1,
    max: 10,
  },

  // --- dungeon ----------------------------------------------------------
  dungeon: {
    width: 64,
    height: 44,
    roomAttempts: 140,
    roomMin: 5,
    roomMax: 12,
    // spawn points and caches scale with the number of rooms carved
    spawnPointsPerRoom: 1.2,
    cachesPerRoom: 0.9,
    minSpawnSeparation: 6, // tiles between two spawn points
  },

  // --- players ----------------------------------------------------------
  player: {
    health: [70, 130],
    mana: [40, 110],
    speed: [3.2, 5.4], // tiles per second
    manaRegenPerSec: [2.5, 6.0],
    inventorySize: 8,
    // Swapping a held item is deliberate: you stop, you swap, you move on.
    weaponSwapMs: 900,
    // Attribute floors/ceilings after caches have been applied. Keys must
    // match the boon `attr` names in items.js (which match the real player
    // fields, e.g. player.maxHealth) — a health/mana vs maxHealth/maxMana
    // mismatch here crashed the server the moment anyone picked up a
    // Vital Draught or Wellspring Vial boon.
    clamp: {
      maxHealth: [20, 400],
      maxMana: [0, 400],
      speed: [1.2, 9.0],
      manaRegenPerSec: [0.5, 20],
    },
  },
};
