export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function gaussian(rng: Rng): number {
  const uniform = 1 - rng();
  const angle = 2 * Math.PI * rng();
  return Math.sqrt(-2 * Math.log(uniform)) * Math.cos(angle);
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
