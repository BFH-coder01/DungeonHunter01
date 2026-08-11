// Item catalogue. A cache rolls from these tables.
//
// Two families matter for the control scheme:
//   - kind 'weapon': held in hand. Swapping costs `player.weaponSwapMs`, so a
//     weapon change is a commitment, not a hotkey tap.
//   - kind 'spell':  known, not held. Castable immediately as long as you have
//     the mana and the cooldown is up — the fast option, gated by regen.

export const WEAPONS = {
  rusted_dagger: { name: 'Rusted Dagger', damage: 8, range: 1.1, swingMs: 320 },
  short_sword: { name: 'Short Sword', damage: 14, range: 1.4, swingMs: 480 },
  war_axe: { name: 'War Axe', damage: 24, range: 1.5, swingMs: 820 },
  spear: { name: 'Spear', damage: 16, range: 2.2, swingMs: 640 },
  maul: { name: 'Maul', damage: 34, range: 1.6, swingMs: 1150 },
};

export const SPELLS = {
  spark: { name: 'Spark', damage: 10, range: 6, manaCost: 8, cooldownMs: 450 },
  frost_lance: { name: 'Frost Lance', damage: 18, range: 9, manaCost: 16, cooldownMs: 900 },
  ember_burst: { name: 'Ember Burst', damage: 26, range: 4, manaCost: 24, cooldownMs: 1200 },
  mend: { name: 'Mend', heal: 25, range: 0, manaCost: 20, cooldownMs: 2000 },
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
  if (r < 0.45) return makeWeapon(rng.pick(Object.keys(WEAPONS)));
  if (r < 0.75) return makeSpell(rng.pick(Object.keys(SPELLS)));
  return makeBoon(rng);
}
