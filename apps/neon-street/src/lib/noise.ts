import { createRng } from './rng';

const smooth = (t: number): number => t * t * (3 - 2 * t);

export type Noise2D = (x: number, y: number) => number;

export function createValueNoise(seed: number, size = 256): Noise2D {
  const rng = createRng(seed);
  const lattice = Float32Array.from({ length: size * size }, () => rng());
  const at = (x: number, y: number) => lattice[(((y % size) + size) % size) * size + (((x % size) + size) % size)];

  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = smooth(x - x0);
    const ty = smooth(y - y0);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

export function fbm(noise: Noise2D, x: number, y: number, octaves = 5): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * frequency, y * frequency) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}
