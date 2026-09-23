export type Random = () => number;

export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

export function range(random: Random, min: number, max: number): number {
  return min + random() * (max - min);
}

const gradients = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

export type Noise3 = (x: number, y: number, z: number) => number;

export function createNoise3(random: Random): Noise3 {
  const permutation = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) permutation[i] = base[i & 255];

  const skew = 1 / 3;
  const unskew = 1 / 6;

  const corner = (gi: number, x: number, y: number, z: number) => {
    const t = 0.6 - x * x - y * y - z * z;
    if (t < 0) return 0;
    const g = gradients[gi % 12];
    const t2 = t * t;
    return t2 * t2 * (g[0] * x + g[1] * y + g[2] * z);
  };

  return (xin, yin, zin) => {
    const s = (xin + yin + zin) * skew;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * unskew;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);

    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0];
      else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1];
      else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1];
    } else if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1];
    else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1];
    else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0];

    const x1 = x0 - i1 + unskew;
    const y1 = y0 - j1 + unskew;
    const z1 = z0 - k1 + unskew;
    const x2 = x0 - i2 + 2 * unskew;
    const y2 = y0 - j2 + 2 * unskew;
    const z2 = z0 - k2 + 2 * unskew;
    const x3 = x0 - 1 + 3 * unskew;
    const y3 = y0 - 1 + 3 * unskew;
    const z3 = z0 - 1 + 3 * unskew;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const p = permutation;

    return (
      32 *
      (corner(p[ii + p[jj + p[kk]]], x0, y0, z0) +
        corner(p[ii + i1 + p[jj + j1 + p[kk + k1]]], x1, y1, z1) +
        corner(p[ii + i2 + p[jj + j2 + p[kk + k2]]], x2, y2, z2) +
        corner(p[ii + 1 + p[jj + 1 + p[kk + 1]]], x3, y3, z3))
    );
  };
}

export function fractal(noise: Noise3, x: number, y: number, z: number, octaves: number): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * frequency, y * frequency, z * frequency) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / total;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}
