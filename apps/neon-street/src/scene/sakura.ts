import { between, pick, type Rng } from '../lib/rng';
import { alpha, type Ctx, mix, softGlow, withState } from './canvas';
import { NEON, SAKURA } from './palette';

type Blossom = { x: number; y: number; radius: number };

export type Bough = {
  x: number;
  y: number;
  angle: number;
  length: number;
  thickness: number;
  levels: number;
  scale: number;
  rim?: string;
};

export function paintSakura(ctx: Ctx, rng: Rng, bough: Bough): void {
  const blossoms: Blossom[] = [];
  const limbs: Array<() => void> = [];
  const rim = bough.rim ?? NEON.pink;

  const grow = (x: number, y: number, angle: number, length: number, thickness: number, level: number) => {
    const bend = between(rng, -0.35, 0.35);
    const ex = x + Math.cos(angle) * length;
    const ey = y + Math.sin(angle) * length;
    const cx = x + Math.cos(angle + bend) * length * 0.55;
    const cy = y + Math.sin(angle + bend) * length * 0.55;
    limbs.push(() => limb(ctx, x, y, cx, cy, ex, ey, thickness, rim));

    if (level >= bough.levels - 2) blossoms.push({ x: (x + ex) / 2, y: (y + ey) / 2, radius: length * 0.7 });
    if (level >= bough.levels) {
      blossoms.push({ x: ex, y: ey, radius: length * 0.9 });
      return;
    }
    const children = rng() < 0.3 ? 3 : 2;
    for (let i = 0; i < children; i++) {
      const spread = between(rng, 0.25, 0.7) * (i % 2 === 0 ? -1 : 1);
      const lift = (-Math.PI / 2 - angle) * 0.12;
      grow(ex, ey, angle + spread + lift, length * between(rng, 0.66, 0.82), thickness * 0.64, level + 1);
    }
  };

  grow(bough.x, bough.y, bough.angle, bough.length, bough.thickness, 0);

  const back = blossoms.slice(0, Math.ceil(blossoms.length * 0.55));
  for (const b of back) cluster(ctx, rng, b, bough.scale, 0.55);
  for (const draw of limbs) draw();
  for (const b of blossoms) cluster(ctx, rng, b, bough.scale, 1);

  const canopy = blossoms.reduce(
    (acc, b) => ({ x: acc.x + b.x / blossoms.length, y: acc.y + b.y / blossoms.length }),
    { x: 0, y: 0 },
  );
  softGlow(ctx, canopy.x, canopy.y, bough.length * 2.2, '#ff7ab6', 0.07);
}

function limb(
  ctx: Ctx,
  x: number,
  y: number,
  cx: number,
  cy: number,
  ex: number,
  ey: number,
  thickness: number,
  rim: string,
): void {
  withState(ctx, () => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#120a10';
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    if (thickness > 1.5) {
      ctx.strokeStyle = alpha(rim, 0.35);
      ctx.lineWidth = Math.max(0.6, thickness * 0.22);
      ctx.beginPath();
      ctx.moveTo(x + thickness * 0.3, y);
      ctx.quadraticCurveTo(cx + thickness * 0.3, cy, ex + thickness * 0.3, ey);
      ctx.stroke();
    }
  });
}

function cluster(ctx: Ctx, rng: Rng, blossom: Blossom, scale: number, light: number): void {
  const count = Math.round(between(rng, 9, 18) * Math.min(2.2, Math.max(0.6, blossom.radius / (18 * scale))));
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rng()) * blossom.radius;
    const t = rng() * Math.PI * 2;
    const x = blossom.x + Math.cos(t) * r;
    const y = blossom.y + Math.sin(t) * r * 0.75;
    const size = between(rng, 1.6, 3.6) * scale;
    const underside = Math.max(0, Math.sin(t)) * 0.45;
    const base = pick(rng, SAKURA);
    const color = mix(mix(base, '#6e2552', underside + (1 - light) * 0.45 + 0.18), '#ffffff', rng() < 0.08 ? 0.5 : 0);
    ctx.fillStyle = alpha(color, between(rng, 0.45, 0.85));
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    if (light > 0.9 && rng() < 0.08) {
      ctx.fillStyle = 'rgba(255, 240, 248, 0.8)';
      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
