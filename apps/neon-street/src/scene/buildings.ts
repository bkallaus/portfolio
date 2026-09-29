import { between, chance, pick, type Rng } from '../lib/rng';
import { alpha, type Ctx, mix, softGlow, withState } from './canvas';
import { NEON } from './palette';

export type FacadeStyle = {
  body: string;
  haze: string;
  hazeAmount: number;
  cell: number;
  litRatio: number;
  rim: number;
};

const WINDOW_LIGHT = ['#ffd49a', '#ffc27a', '#fff1d6', '#9ee9ff', '#ff9ccc', '#c8b6ff'] as const;

export function facade(
  ctx: Ctx,
  rng: Rng,
  x: number,
  top: number,
  width: number,
  bottom: number,
  style: FacadeStyle,
): void {
  const body = mix(style.body, style.haze, style.hazeAmount);
  withState(ctx, () => {
    const gradient = ctx.createLinearGradient(x, top, x + width, top);
    gradient.addColorStop(0, mix(body, NEON.cyan, 0.06 * style.rim));
    gradient.addColorStop(0.18, body);
    gradient.addColorStop(0.82, body);
    gradient.addColorStop(1, mix(body, NEON.pink, 0.1 * style.rim));
    ctx.fillStyle = gradient;
    ctx.fillRect(x, top, width, bottom - top);

    const shade = ctx.createLinearGradient(0, top, 0, top + (bottom - top) * 0.6);
    shade.addColorStop(0, 'rgba(255, 120, 200, 0.05)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shade;
    ctx.fillRect(x, top, width, bottom - top);

    ctx.fillStyle = alpha(NEON.cyan, 0.25 * style.rim);
    ctx.fillRect(x, top, Math.max(0.6, width * 0.012), bottom - top);
    ctx.fillStyle = alpha(NEON.pink, 0.3 * style.rim);
    ctx.fillRect(x + width - Math.max(0.6, width * 0.012), top, Math.max(0.6, width * 0.012), bottom - top);
  });

  windows(ctx, rng, x, top, width, bottom, style);
}

function windows(ctx: Ctx, rng: Rng, x: number, top: number, width: number, bottom: number, style: FacadeStyle): void {
  const cell = style.cell;
  const pad = Math.max(2, cell * 0.6);
  const cols = Math.max(1, Math.floor((width - pad * 2) / cell));
  const offset = x + (width - cols * cell) / 2;
  const glowAlpha = 1 - style.hazeAmount * 0.8;
  const floorBands = chance(rng, 0.35);
  let row = 0;
  for (let y = top + pad; y < bottom - cell; y += cell * 1.25, row++) {
    const floorLit = rng() < style.litRatio * 1.6;
    for (let c = 0; c < cols; c++) {
      const wx = offset + c * cell + cell * 0.18;
      const wy = y + cell * 0.12;
      const ww = cell * 0.64;
      const wh = cell * 0.82;
      if (floorLit && rng() < style.litRatio * (floorBands ? 1.8 : 1.1)) {
        const color = pick(rng, WINDOW_LIGHT);
        const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
        g.addColorStop(0, alpha(color, 0.95 * glowAlpha));
        g.addColorStop(1, alpha(mix(color, '#402030', 0.45), 0.9 * glowAlpha));
        ctx.fillStyle = g;
        ctx.fillRect(wx, wy, ww, wh);
        if (cell > 7 && chance(rng, 0.4)) {
          ctx.fillStyle = 'rgba(20, 8, 16, 0.35)';
          for (let b = wy + 2; b < wy + wh; b += 2.5) ctx.fillRect(wx, b, ww, 0.8);
        }
        if (cell > 9 && chance(rng, 0.12)) {
          ctx.fillStyle = 'rgba(10, 4, 10, 0.75)';
          ctx.beginPath();
          ctx.ellipse(wx + ww * 0.5, wy + wh * 0.45, ww * 0.12, wh * 0.14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(wx + ww * 0.32, wy + wh * 0.58, ww * 0.36, wh * 0.42);
        }
      } else {
        ctx.fillStyle = alpha('#1c1830', 0.55 + 0.2 * rng());
        ctx.fillRect(wx, wy, ww, wh);
        if (chance(rng, 0.25)) {
          ctx.fillStyle = alpha(pick(rng, [NEON.pink, NEON.cyan, NEON.violet]), 0.12 * glowAlpha);
          ctx.fillRect(wx, wy, ww, wh * 0.4);
        }
      }
    }
    if (row > 400) break;
  }
}

export function airConditioners(ctx: Ctx, rng: Rng, x: number, top: number, width: number, bottom: number, size: number): void {
  const count = Math.floor(((bottom - top) / size) * 0.08 * (width / size) * 0.4);
  for (let i = 0; i < count; i++) {
    const ax = x + between(rng, 0.05, 0.85) * width;
    const ay = top + between(rng, 0.05, 0.95) * (bottom - top);
    withState(ctx, () => {
      ctx.fillStyle = '#2a2632';
      ctx.fillRect(ax, ay, size * 1.4, size);
      ctx.fillStyle = 'rgba(255, 110, 190, 0.18)';
      ctx.fillRect(ax, ay, size * 1.4, 1);
      ctx.strokeStyle = '#14121a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ax + size * 0.5, ay + size * 0.5, size * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#0a090d';
      ctx.fillRect(ax + size * 0.35, ay + size, 1, size * between(rng, 0.8, 3));
    });
  }
}

export function rooftop(ctx: Ctx, rng: Rng, x: number, top: number, width: number, scale: number, blink: boolean): void {
  withState(ctx, () => {
    ctx.fillStyle = '#0d0b14';
    if (chance(rng, 0.5)) {
      const tw = scale * between(rng, 2.5, 4);
      const tx = x + between(rng, 0.1, 0.7) * width;
      ctx.fillRect(tx, top - scale * 3.2, tw, scale * 2.4);
      ctx.fillRect(tx + tw * 0.15, top - scale * 0.8, 1.5, scale * 0.8);
      ctx.fillRect(tx + tw * 0.8, top - scale * 0.8, 1.5, scale * 0.8);
    }
    const antennaX = x + between(rng, 0.2, 0.8) * width;
    const antennaH = scale * between(rng, 3, 9);
    ctx.fillRect(antennaX, top - antennaH, Math.max(1, scale * 0.18), antennaH);
    if (chance(rng, 0.5)) ctx.fillRect(antennaX - scale, top - antennaH * 0.7, scale * 2, 1);
    if (blink) softGlow(ctx, antennaX, top - antennaH, scale * 2.4, NEON.red, 0.9);
  });
}

export function neonEdge(ctx: Ctx, x: number, top: number, bottom: number, color: string, width: number): void {
  withState(ctx, () => {
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 6;
    ctx.fillStyle = mix(color, NEON.white, 0.35);
    ctx.fillRect(x, top, width, bottom - top);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - width * 12, 0, x + width * 12, 0);
    g.addColorStop(0, alpha(color, 0));
    g.addColorStop(0.5, alpha(color, 0.18));
    g.addColorStop(1, alpha(color, 0));
    ctx.shadowBlur = 0;
    ctx.fillStyle = g;
    ctx.fillRect(x - width * 12, top, width * 24, bottom - top);
  });
}
