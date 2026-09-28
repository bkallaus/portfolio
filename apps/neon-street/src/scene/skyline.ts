import { between, chance, pick } from '../lib/rng';
import { alpha, type Ctx, hazeBand, mix, withState } from './canvas';
import { billboard, horizontalSign } from './signs';
import { facade, neonEdge, rooftop } from './buildings';
import { type LayerFrame, vh, vw } from './frame';
import { ATMOSPHERE, NEON, NEON_CYCLE } from './palette';

function searchlight(ctx: Ctx, x: number, baseY: number, angle: number, length: number, color: string): void {
  withState(ctx, () => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, baseY);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(0, 0, 0, -length);
    g.addColorStop(0, alpha(color, 0.2));
    g.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-length * 0.07, -length);
    ctx.lineTo(length * 0.07, -length);
    ctx.lineTo(4, 0);
    ctx.fill();
  });
}

export function paintFarSkyline(frame: LayerFrame): void {
  const { ctx, width, height, rng, groundY } = frame;

  for (let i = 0; i < 4; i++) {
    searchlight(ctx, between(rng, 0.1, 0.9) * width, groundY, between(rng, -0.35, 0.35), vh(frame, 1.3), pick(rng, [NEON.cyan, NEON.pink, '#ffffff']));
  }

  const rows = [
    { haze: 0.78, min: 0.18, max: 0.5, cell: 3 },
    { haze: 0.62, min: 0.12, max: 0.42, cell: 3.5 },
  ];
  for (const row of rows) {
    let x = -vw(frame, 0.02);
    while (x < width) {
      const w = between(rng, vw(frame, 0.018), vw(frame, 0.06));
      const mega = chance(rng, 0.07);
      const h = vh(frame, between(rng, row.min, row.max) * (mega ? 1.9 : 1));
      const top = groundY - h;
      facade(ctx, rng, x, top, w, height, { body: '#0e0b1c', haze: ATMOSPHERE.fog, hazeAmount: row.haze, cell: row.cell, litRatio: 0.22, rim: 0.3 });
      if (mega) {
        const crown = w * 0.6;
        withState(ctx, () => {
          ctx.fillStyle = mix('#0e0b1c', ATMOSPHERE.fog, row.haze);
          ctx.fillRect(x + (w - crown) / 2, top - h * 0.12, crown, h * 0.12);
        });
        neonEdge(ctx, x + w * 0.5, top - h * 0.12, top + h * 0.3, pick(rng, NEON_CYCLE), 1);
      }
      rooftop(ctx, rng, x, top, w, 2, chance(rng, 0.4));
      x += w + between(rng, -2, vw(frame, 0.01));
    }
  }
  hazeBand(ctx, width, groundY - vh(frame, 0.45), height, ATMOSPHERE.fogWarm, 0.92);
}

export function paintTowers(frame: LayerFrame): void {
  const { ctx, width, height, rng, groundY } = frame;
  let x = -vw(frame, 0.03);
  let billboards = 0;
  while (x < width) {
    const w = between(rng, vw(frame, 0.05), vw(frame, 0.11));
    const h = vh(frame, between(rng, 0.35, 0.95));
    const top = groundY - h;
    facade(ctx, rng, x, top, w, height, { body: '#0b0916', haze: ATMOSPHERE.fog, hazeAmount: between(rng, 0.4, 0.52), cell: between(rng, 4, 6.5), litRatio: between(rng, 0.15, 0.4), rim: 0.6 });
    rooftop(ctx, rng, x, top, w, 3, chance(rng, 0.6));
    if (chance(rng, 0.35)) neonEdge(ctx, chance(rng, 0.5) ? x + 1 : x + w - 3, top, top + h * between(rng, 0.2, 0.6), pick(rng, NEON_CYCLE), 1.4);
    if (w > vw(frame, 0.07) && billboards < 3 && chance(rng, 0.5)) {
      const bw = w * 0.82;
      billboard(ctx, rng, x + (w - bw) / 2, top + h * between(rng, 0.15, 0.4), bw, bw * 0.55);
      billboards++;
    } else if (chance(rng, 0.3)) {
      horizontalSign(ctx, rng, x + w / 2, top + h * between(rng, 0.1, 0.5), w * 0.8, pick(rng, NEON_CYCLE), pick(rng, ['電脳', 'HOTEL', 'NEO', '酒場', 'KIRIN']));
    }
    x += w + between(rng, vw(frame, 0.005), vw(frame, 0.03));
  }
  hazeBand(ctx, width, groundY - vh(frame, 0.4), height, ATMOSPHERE.fogWarm, 0.88);
}
