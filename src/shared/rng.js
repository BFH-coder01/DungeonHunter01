// Small seedable RNG so a dungeon seed always regenerates the same dungeon.
// mulberry32 — fast, good enough for level generation.

export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // int in [min, max] inclusive
  rng.int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  // float in [min, max)
  rng.float = (min, max) => min + rng() * (max - min);
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  rng.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  return rng;
}

export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}
