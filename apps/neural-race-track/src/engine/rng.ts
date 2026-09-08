export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  gaussian: () => number;
};

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number) => min + (max - min) * next();
  const gaussian = () => {
    const u = Math.max(next(), 1e-9);
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { next, range, gaussian };
};

export const randomSeed = (): number => Math.floor(Math.random() * 0xffffffff) >>> 0;
