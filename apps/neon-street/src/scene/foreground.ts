import { between } from '../lib/rng';
import { createSurface, withState } from './canvas';
import { type LayerFrame, vh } from './frame';
import { NEON } from './palette';
import { paintSakura } from './sakura';
import { cable, verticalSign } from './signs';

export function paintForeground(frame: LayerFrame): void {
  const { ctx, width, height, rng, margin, viewportHeight } = frame;
  const scale = viewportHeight / 900;
  const soft = createSurface(width, height, ctx.getTransform().a);

  paintSakura(soft.ctx, rng, { x: -20, y: vh(frame, 0.55), angle: -0.28, length: vh(frame, 0.26), thickness: 26 * scale, levels: 6, scale: 2.6 * scale, rim: NEON.cyan });
  paintSakura(soft.ctx, rng, { x: width + 20, y: vh(frame, 1.35), angle: Math.PI + 0.3, length: vh(frame, 0.24), thickness: 24 * scale, levels: 6, scale: 2.4 * scale });
  paintSakura(soft.ctx, rng, { x: -30, y: height - margin - vh(frame, 0.55), angle: -0.45, length: vh(frame, 0.2), thickness: 20 * scale, levels: 5, scale: 2.6 * scale });

  withState(ctx, () => {
    ctx.filter = 'blur(2.5px)';
    ctx.drawImage(soft.canvas, 0, 0, width, height);
  });

  const poleX = width - margin - 40 * scale;
  const poleTop = height - margin - vh(frame, 1.6);
  withState(ctx, () => {
    ctx.filter = 'blur(1.2px)';
    const g = ctx.createLinearGradient(poleX - 9 * scale, 0, poleX + 9 * scale, 0);
    g.addColorStop(0, '#2a1830');
    g.addColorStop(0.5, '#06040a');
    g.addColorStop(1, '#3a1a3a');
    ctx.fillStyle = g;
    ctx.fillRect(poleX - 9 * scale, poleTop, 18 * scale, height - poleTop);
    ctx.fillStyle = '#06040a';
    ctx.fillRect(poleX - 60 * scale, poleTop + 30 * scale, 120 * scale, 6 * scale);
    ctx.fillRect(poleX - 22 * scale, poleTop + 60 * scale, 30 * scale, 44 * scale);
  });
  for (let i = 0; i < 3; i++) {
    cable(ctx, poleX - 50 * scale + i * 50 * scale, poleTop + 30 * scale, -40, poleTop + between(rng, 60, 260), between(rng, 60, 140), 2.4 * scale);
  }
  verticalSign(ctx, rng, poleX - 58 * scale, poleTop + vh(frame, 0.45), 44 * scale, '夜桜通り', NEON.pink);
}
