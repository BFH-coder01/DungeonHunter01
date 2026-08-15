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
    width: 192,
    height: 132,
    roomAttempts: 1800,
    roomMin: 4,
    roomMax: 8,
    // Short local loops add route choices without long cross-map cuts merging
    // rooms and passages into broad open floor fields.
    extraCorridorsPerRoom: 0.9,
    corridorNeighborChoices: 8,
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
    maxStamina: 100,
    staminaRegenPerSec: 10,
    staminaRegenDelayMs: 1_000,
    movementSpeedScale: 1.4,
    movementStaminaPerSec: 14,
    inventorySize: 8,
    inventorySideSize: 4,
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

  // Combat actions are exclusive. Movement remains responsive, but committed
  // actions scale it down until their wind-up/recovery has finished.
  combat: {
    castMoveScale: 0.4,
    battlePortalRadius: 0.65,
    battlePortalCooldownMs: 20_000,
    battlePortalMinCenterDistanceRatio: 0.25,
    linkPortalRadius: 0.6,
  },

  // Cache rewards stay scarce but circulate. Equipment and spells return
  // through use-based wear; boons are temporary and return when their effect
  // ends.
  rewards: {
    boonLifetimeMs: 2 * 60_000,
    cacheRespawnDelayMs: [8_000, 16_000],
    cacheMinSeparation: 5,
    cacheMinRelocationDistance: 12,
  },
};
