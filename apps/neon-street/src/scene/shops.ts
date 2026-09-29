import { between, chance, pick, type Rng } from '../lib/rng';
import { alpha, type Ctx, ellipticGlow, mix, withState } from './canvas';
import { NEON, NEON_CYCLE, SIGNS_EN, SIGNS_JP } from './palette';
import { horizontalSign } from './signs';

export function storefront(ctx: Ctx, rng: Rng, x: number, width: number, ground: number, height: number): void {
  const color = pick(rng, NEON_CYCLE);
  const shutter = chance(rng, 0.2);
  const interior = pick(rng, ['#ffcf8f', '#ffe7c4', '#ffb3d4', '#bff3ff']);
  const top = ground - height;
  withState(ctx, () => {
    const g = ctx.createLinearGradient(0, top, 0, ground);
    g.addColorStop(0, mix(interior, '#3a1a28', 0.25));
    g.addColorStop(1, mix(interior, '#2a1018', 0.6));
    ctx.fillStyle = shutter ? '#26222c' : g;
    ctx.fillRect(x, top, width, height);
    if (shutter) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let y = top; y < ground; y += 3) ctx.fillRect(x, y, width, 1);
      ctx.fillStyle = alpha(color, 0.12);
      ctx.fillRect(x, top, width, height);
    } else {
      ctx.fillStyle = 'rgba(20, 10, 16, 0.75)';
      for (let i = 0; i < 4; i++) {
        const px = x + between(rng, 0.1, 0.9) * width;
        const ph = height * between(rng, 0.45, 0.62);
        ctx.beginPath();
        ctx.ellipse(px, ground - ph, ph * 0.09, ph * 0.11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(px - ph * 0.14, ground - ph * 0.88, ph * 0.28, ph * 0.88);
      }
      ctx.fillStyle = '#120c12';
      for (let m = x; m < x + width; m += width / Math.ceil(width / 38)) ctx.fillRect(m, top, 2, height);
      ctx.fillRect(x, top + height * 0.3, width, 2);
    }
    ellipticGlow(ctx, x + width / 2, ground, width * 0.8, height * 0.9, interior, shutter ? 0.04 : 0.14);

    ctx.fillStyle = mix(color, '#160812', 0.55);
    ctx.beginPath();
    ctx.moveTo(x - 6, top);
    ctx.lineTo(x + width + 6, top);
    ctx.lineTo(x + width + 12, top + height * 0.16);
    ctx.lineTo(x - 12, top + height * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = mix(color, NEON.white, 0.4);
    ctx.fillRect(x - 12, top + height * 0.16 - 2, width + 24, 2);
  });
  horizontalSign(ctx, rng, x + width / 2, top - height * 0.3, width * 0.55, color, pick(rng, chance(rng, 0.35) ? SIGNS_JP : SIGNS_EN));
}
