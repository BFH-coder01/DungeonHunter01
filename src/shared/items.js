// Item catalogue. A cache rolls from these tables.
//
// Three families matter for the control scheme:
//   - kind 'weapon': held in hand. Swapping costs `player.weaponSwapMs`, so a
//     weapon change is a commitment, not a hotkey tap.
//   - kind 'shield': held in hand. Activating that hand performs a dodge.
//   - kind 'spell':  known, not held. Castable immediately as long as you have
//     the mana and the cooldown is up — the fast option, gated by regen.

export const WEAPONS = {
  rusted_dagger: { name: 'Rusted Dagger', damage: 8, range: 1.1, windupMs: 110, swingMs: 320, staminaCost: 12, windupMoveScale: 0.85, recoveryMoveScale: 0.9, attackStyle: 'stab', minDot: 0.9, maxTargets: 1 },
  short_sword: { name: 'Short Sword', damage: 14, range: 1.4, windupMs: 180, swingMs: 480, staminaCost: 20, windupMoveScale: 0.7, recoveryMoveScale: 0.8, attackStyle: 'swing', minDot: 0.65, maxTargets: 1 },
  war_axe: { name: 'War Axe', damage: 24, range: 1.5, windupMs: 330, swingMs: 820, staminaCost: 32, windupMoveScale: 0.5, recoveryMoveScale: 0.65, attackStyle: 'cleave', minDot: 0.3, maxTargets: 3 },
  spear: { name: 'Spear', damage: 16, range: 2.2, windupMs: 240, swingMs: 640, staminaCost: 24, windupMoveScale: 0.65, recoveryMoveScale: 0.75, attackStyle: 'thrust', minDot: 0.94, maxTargets: 1 },
  maul: { name: 'Maul', damage: 34, range: 1.6, windupMs: 500, swingMs: 1150, staminaCost: 42, windupMoveScale: 0.35, recoveryMoveScale: 0.55, attackStyle: 'swing', minDot: 0.58, maxTargets: 1, knockback: 0.75 },
  throwing_knife: { name: 'Throwing Knife', damage: 12, range: 7, windupMs: 250, swingMs: 600, staminaCost: 18, windupMoveScale: 0.65, recoveryMoveScale: 0.75, attackStyle: 'throw', minDot: 1, maxTargets: 1, throwable: true, projectileSpeed: 9 },
};

export const SHIELDS = {
  iron_buckler: { name: 'Iron Buckler', dodgeDistance: 1.8, dodgeMs: 240, cooldownMs: 1600, staminaCost: 35 },
};

export const SPELLS = {
  spark: { name: 'Spark', damage: 10, range: 6, manaCost: 8, windupMs: 320, cooldownMs: 650, projectileSpeed: 8, projectileStyle: 'spark' },
  frost_lance: { name: 'Frost Lance', damage: 18, range: 9, manaCost: 16, windupMs: 560, cooldownMs: 1100, projectileSpeed: 11, projectileStyle: 'frost', slowMs: 1400 },
  ember_burst: { name: 'Ember Burst', damage: 26, range: 4, manaCost: 24, windupMs: 720, cooldownMs: 1500, projectileSpeed: 5.5, projectileStyle: 'ember', blastRadius: 1.6 },
  mend: { name: 'Mend', heal: 25, range: 0, manaCost: 20, windupMs: 800, cooldownMs: 2200, projectileStyle: 'mend' },
};

// Attribute modifiers a cache can hold. Negative rolls are intentional — a
// cache is a gamble, not a reward.
export const BOONS = [
  { id: 'vitality', name: 'Vital Draught', attr: 'maxHealth', delta: [10, 35] },
  { id: 'rot', name: 'Rotting Sludge', attr: 'maxHealth', delta: [-30, -8] },
  { id: 'wellspring', name: 'Wellspring Vial', attr: 'maxMana', delta: [10, 30] },
  { id: 'drain', name: 'Manablight', attr: 'maxMana', delta: [-25, -8] },
  { id: 'swift', name: 'Swiftfoot Oil', attr: 'speed', delta: [0.4, 1.2] },
  { id: 'mire', name: 'Mire Tar', attr: 'speed', delta: [-1.0, -0.3] },
  { id: 'focus', name: 'Focus Stone', attr: 'manaRegenPerSec', delta: [0.8, 2.5] },
  { id: 'fog', name: 'Clouded Mind', attr: 'manaRegenPerSec', delta: [-1.8, -0.5] },
];

let nextItemId = 1;

export function makeWeapon(key) {
  const def = WEAPONS[key];
  return { uid: `i${nextItemId++}`, kind: 'weapon', key, name: def.name, ...def };
}

export function makeSpell(key) {
  const def = SPELLS[key];
  return { uid: `i${nextItemId++}`, kind: 'spell', key, name: def.name, ...def };
}

export function makeShield(key) {
  const def = SHIELDS[key];
  return { uid: `i${nextItemId++}`, kind: 'shield', key, name: def.name, ...def };
}

export function makeBoon(rng) {
  const b = rng.pick(BOONS);
  const raw = rng.float(b.delta[0], b.delta[1]);
  const delta = b.attr === 'speed' || b.attr === 'manaRegenPerSec'
    ? Math.round(raw * 10) / 10
    : Math.round(raw);
  return { uid: `i${nextItemId++}`, kind: 'boon', key: b.id, name: b.name, attr: b.attr, delta };
}

// One cache holds one item. Weighted so weapons are the common find.
export function rollCacheItem(rng) {
  const r = rng();
  if (r < 0.40) return makeWeapon(rng.pick(Object.keys(WEAPONS)));
  if (r < 0.52) return makeShield(rng.pick(Object.keys(SHIELDS)));
  if (r < 0.78) return makeSpell(rng.pick(Object.keys(SPELLS)));
  return makeBoon(rng);
}
