import { PETAL_VARIANTS } from '../lib/petals';
import { createSurface, withState } from './canvas';

export const SPRITE_SIZE = 64;

const TINTS = [
  { base: '#f47fb1', tip: '#ffe8f2', rim: null },
  { base: '#ff9cc6', tip: '#fff3f8', rim: null },
  { base: '#e86aa6', tip: '#ffd3e6', rim: '#ff3df2' },
  { base: '#f58ab8', tip: '#ffe4ef', rim: '#23e6ff' },
] as const;

function drawPetal(ctx: CanvasRenderingContext2D, tint: (typeof TINTS)[number]): void {
  const s = SPRITE_SIZE * 0.36;
  withState(ctx, () => {
    ctx.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s * 0.95, s * 0.45, -s * 0.85, -s * 0.72, -s * 0.24, -s);
    ctx.quadraticCurveTo(-s * 0.08, -s * 0.8, 0, -s * 0.74);
    ctx.quadraticCurveTo(s * 0.08, -s * 0.8, s * 0.24, -s);
    ctx.bezierCurveTo(s * 0.85, -s * 0.72, s * 0.95, s * 0.45, 0, s);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, s * 0.85, s * 0.05, 0, 0, s * 1.4);
    g.addColorStop(0, tint.base);
    g.addColorStop(1, tint.tip);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.93;
    ctx.fill();
    if (tint.rim) {
      ctx.strokeStyle = tint.rim;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#b8467e';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.9);
    ctx.quadraticCurveTo(s * 0.05, 0, 0, -s * 0.6);
    ctx.stroke();
  });
}

export type PetalSprites = { sharp: HTMLCanvasElement[]; soft: HTMLCanvasElement[] };

export function createPetalSprites(): PetalSprites {
  const sharp: HTMLCanvasElement[] = [];
  const soft: HTMLCanvasElement[] = [];
  for (let i = 0; i < PETAL_VARIANTS; i++) {
    const crisp = createSurface(SPRITE_SIZE, SPRITE_SIZE);
    drawPetal(crisp.ctx, TINTS[i]);
    sharp.push(crisp.canvas);
    const blurred = createSurface(SPRITE_SIZE, SPRITE_SIZE);
    blurred.ctx.filter = 'blur(3px)';
    blurred.ctx.drawImage(crisp.canvas, 0, 0);
    soft.push(blurred.canvas);
  }
  return { sharp, soft };
}
