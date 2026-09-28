import { between, type Rng } from './rng';

export type Petal = {
  x: number;
  y: number;
  depth: number;
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

export type Field = { width: number; height: number };

export type Weather = {
  time: number;
  wind: number;
  cameraShift: number;
};

export const PETAL_VARIANTS = 4;

export function spawnPetal(rng: Rng, field: Field, minDepth: number, maxDepth: number, fromTop: boolean): Petal {
  const depth = between(rng, minDepth, maxDepth);
  return {
    x: between(rng, -0.1, 1.1) * field.width,
    y: fromTop ? between(rng, -0.25, -0.02) * field.height : between(rng, 0, 1) * field.height,
    depth,
    size: between(rng, 7, 12) * depth,
    angle: between(rng, 0, Math.PI * 2),
    spin: between(rng, -1.4, 1.4),
    flip: between(rng, 0, Math.PI * 2),
    flipSpeed: between(rng, 1.2, 3.4),
    phase: between(rng, 0, Math.PI * 2),
    sway: between(rng, 14, 38),
    fall: between(rng, 34, 62),
    variant: Math.floor(rng() * PETAL_VARIANTS),
  };
}

export function stepPetal(petal: Petal, dt: number, weather: Weather): void {
  const flutter = Math.sin(weather.time * 1.3 + petal.phase);
  const glide = Math.abs(Math.cos(petal.flip));
  petal.x += (weather.wind * 60 + flutter * petal.sway) * petal.depth * dt;
  petal.y += petal.fall * (0.55 + 0.45 * glide) * petal.depth * dt - weather.cameraShift * petal.depth;
  petal.angle += petal.spin * dt + flutter * 0.01;
  petal.flip += petal.flipSpeed * dt;
}

export function wrapPetal(petal: Petal, field: Field): boolean {
  const pad = petal.size * 4;
  if (petal.x < -pad) petal.x += field.width + pad * 2;
  else if (petal.x > field.width + pad) petal.x -= field.width + pad * 2;
  if (petal.y > field.height + pad) {
    petal.y = -pad;
    return true;
  }
  if (petal.y < -field.height * 0.3 - pad) {
    petal.y = field.height + pad;
    return true;
  }
  return false;
}

export const petalScaleX = (petal: Petal): number => Math.max(0.12, Math.abs(Math.cos(petal.flip)));
