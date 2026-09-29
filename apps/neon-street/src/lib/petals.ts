import { between, type Rng } from './rng';

export type Petal = {
  x: number;
  y: number;
  z: number;
  size: number;
  angle: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  phase: number;
  sway: number;
  fall: number;
  variant: number;
};

export type Anchor = { x: number; y: number; z: number };

export type Volume = { near: number; far: number; halfWidth: number; below: number; above: number };

export type Weather = { time: number; wind: number };

export const PETAL_VARIANTS = 4;

export const PETAL_VOLUME: Volume = { near: 0.5, far: 30, halfWidth: 8, below: 6, above: 9 };

export function spawnPetal(rng: Rng, anchor: Anchor, volume: Volume, fromAbove: boolean): Petal {
  const floor = Math.max(0.05, anchor.y - volume.below);
  return {
    x: anchor.x + between(rng, -1, 1) * volume.halfWidth,
    y: fromAbove ? anchor.y + volume.above * between(rng, 0.8, 1) : between(rng, floor, anchor.y + volume.above),
    z: anchor.z + volume.near + (volume.far - volume.near) * rng() ** 0.8,
    size: between(rng, 0.1, 0.17),
    angle: between(rng, 0, Math.PI * 2),
    spin: between(rng, -1.4, 1.4),
    flip: between(rng, 0, Math.PI * 2),
    flipSpeed: between(rng, 1.2, 3.4),
    phase: between(rng, 0, Math.PI * 2),
    sway: between(rng, 0.3, 0.8),
    fall: between(rng, 0.9, 1.6),
    variant: Math.floor(rng() * PETAL_VARIANTS),
  };
}

export function stepPetal(petal: Petal, dt: number, weather: Weather): void {
  const flutter = Math.sin(weather.time * 1.3 + petal.phase);
  const glide = Math.abs(Math.cos(petal.flip));
  petal.x += (weather.wind + flutter * petal.sway) * dt;
  petal.z += weather.wind * 0.35 * dt;
  petal.y -= petal.fall * (0.55 + 0.45 * glide) * dt;
  petal.angle += petal.spin * dt + flutter * 0.01;
  petal.flip += petal.flipSpeed * dt;
}

export function recyclePetal(petal: Petal, rng: Rng, anchor: Anchor, volume: Volume): boolean {
  const floor = Math.max(0.02, anchor.y - volume.below);
  const tooLow = petal.y < floor;
  const tooHigh = petal.y > anchor.y + volume.above * 1.5;
  const passed = petal.z < anchor.z + volume.near * 0.5;
  const tooFar = petal.z > anchor.z + volume.far;
  if (!(tooLow || tooHigh || passed || tooFar)) {
    if (petal.x < anchor.x - volume.halfWidth) petal.x += volume.halfWidth * 2;
    else if (petal.x > anchor.x + volume.halfWidth) petal.x -= volume.halfWidth * 2;
    return false;
  }
  const fresh = spawnPetal(rng, anchor, volume, tooLow);
  if (passed) fresh.z = anchor.z + volume.far * between(rng, 0.6, 1);
  if (tooFar) fresh.z = anchor.z + volume.near + between(rng, 0, 3);
  Object.assign(petal, fresh);
  return true;
}

export const petalScaleX = (petal: Petal): number => Math.max(0.12, Math.abs(Math.cos(petal.flip)));
