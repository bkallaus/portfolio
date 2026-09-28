import { between, chance, pick } from '../lib/rng';
import { hazeBand, withState } from './canvas';
import { airConditioners, facade, neonEdge, rooftop } from './buildings';
import { type LayerFrame, vh, vw } from './frame';
import { ATMOSPHERE, NEON_CYCLE, SIGNS_JP } from './palette';
import { horizontalSign, verticalSign } from './signs';

export function paintDistrict(frame: LayerFrame): void {
  const { ctx, width, height, rng, groundY } = frame;
  let x = -vw(frame, 0.04);
  while (x < width) {
    const w = between(rng, vw(frame, 0.12), vw(frame, 0.22));
    const h = vh(frame, between(rng, 0.55, 1.15));
    const top = groundY - h;
    facade(ctx, rng, x, top, w, height, { body: '#0a0812', haze: ATMOSPHERE.fog, hazeAmount: between(rng, 0.2, 0.32), cell: between(rng, 7, 11), litRatio: between(rng, 0.18, 0.4), rim: 0.9 });
    airConditioners(ctx, rng, x, top + h * 0.1, w, groundY, 7);

    const floors = Math.floor(h / 26);
    withState(ctx, () => {
      ctx.fillStyle = 'rgba(4, 3, 8, 0.55)';
      for (let f = 1; f < floors; f += chance(rng, 0.5) ? 2 : 3) ctx.fillRect(x, top + f * 26, w, 2);
    });

    rooftop(ctx, rng, x, top, w, 5, chance(rng, 0.7));
    if (chance(rng, 0.45)) neonEdge(ctx, x + w * between(rng, 0.1, 0.9), top + h * 0.05, top + h * between(rng, 0.3, 0.7), pick(rng, NEON_CYCLE), 2);

    const signCount = chance(rng, 0.7) ? 2 : 1;
    for (let s = 0; s < signCount; s++) {
      const sw = between(rng, 22, 34);
      const sx = s === 0 ? x + w - sw * 0.6 : x - sw * 0.4;
      verticalSign(ctx, rng, sx, top + h * between(rng, 0.12, 0.45), sw, pick(rng, SIGNS_JP), pick(rng, NEON_CYCLE));
    }
    if (chance(rng, 0.5)) horizontalSign(ctx, rng, x + w / 2, top + h * between(rng, 0.55, 0.75), w * 0.7, pick(rng, NEON_CYCLE));
    x += w + between(rng, vw(frame, 0.01), vw(frame, 0.05));
  }
  hazeBand(ctx, width, groundY - vh(frame, 0.32), height, ATMOSPHERE.fogWarm, 0.82);
}
