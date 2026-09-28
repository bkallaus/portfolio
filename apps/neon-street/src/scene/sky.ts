import { fbm } from '../lib/noise';
import { between } from '../lib/rng';
import { createSurface, ellipticGlow, softGlow, withState } from './canvas';
import type { LayerFrame } from './frame';
import { ATMOSPHERE, NEON } from './palette';

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function paintSky(frame: LayerFrame): void {
  const { ctx, width, height, rng, viewportHeight } = frame;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, ATMOSPHERE.zenith);
  gradient.addColorStop(0.3, ATMOSPHERE.upper);
  gradient.addColorStop(0.62, ATMOSPHERE.mid);
  gradient.addColorStop(0.86, ATMOSPHERE.horizon);
  gradient.addColorStop(1, '#b0336e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  withState(ctx, () => {
    for (let i = 0; i < 90; i++) {
      const y = rng() ** 2 * height * 0.45;
      ctx.fillStyle = `rgba(255, 235, 250, ${between(rng, 0.08, 0.5) * (1 - y / (height * 0.45))})`;
      ctx.fillRect(rng() * width, y, 1.2, 1.2);
    }
  });

  const moonX = width * 0.74;
  const moonY = height * 0.2;
  const moonR = viewportHeight * 0.075;
  softGlow(ctx, moonX, moonY, moonR * 6, '#ff8fc0', 0.22);
  softGlow(ctx, moonX, moonY, moonR * 2, '#ffe3f0', 0.35);
  withState(ctx, () => {
    const disc = ctx.createRadialGradient(moonX - moonR * 0.3, moonY - moonR * 0.3, moonR * 0.1, moonX, moonY, moonR);
    disc.addColorStop(0, '#fff6fa');
    disc.addColorStop(0.7, '#ffd9e9');
    disc.addColorStop(1, '#f2a9c9');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(190, 110, 150, ${between(rng, 0.08, 0.18)})`;
      ctx.beginPath();
      ctx.arc(moonX + between(rng, -1, 1) * moonR, moonY + between(rng, -1, 1) * moonR, between(rng, 0.08, 0.3) * moonR, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  paintClouds(frame, smoothstep);

  ellipticGlow(ctx, width * 0.5, height, width * 0.8, viewportHeight * 0.55, ATMOSPHERE.pollution, 0.35);
  ellipticGlow(ctx, width * 0.18, height * 0.97, width * 0.3, viewportHeight * 0.3, NEON.cyan, 0.08);
}

function paintClouds(frame: LayerFrame, ease: (a: number, b: number, x: number) => number): void {
  const { ctx, width, height, noise, viewportHeight } = frame;
  const scale = 0.2;
  const surface = createSurface(width * scale, height * scale);
  const w = surface.canvas.width;
  const h = surface.canvas.height;
  const image = surface.ctx.createImageData(w, h);
  const data = image.data;
  for (let py = 0; py < h; py++) {
    const y = py / scale;
    const band = ease(0.05, 0.4, y / height) * (1 - ease(0.75, 1, y / height) * 0.6);
    const heat = y / height;
    for (let px = 0; px < w; px++) {
      const x = px / scale;
      const n = fbm(noise, x / (viewportHeight * 0.9), y / (viewportHeight * 0.22), 5);
      const detail = fbm(noise, x / (viewportHeight * 0.18) + 40, y / (viewportHeight * 0.08), 3);
      const density = ease(0.46, 0.78, n * 0.8 + detail * 0.25) * band;
      const below = ease(0.45, 0.8, detail);
      const i = (py * w + px) * 4;
      data[i] = 40 + 150 * heat + 60 * below * heat;
      data[i + 1] = 18 + 40 * heat + 30 * below * heat;
      data[i + 2] = 60 + 70 * heat;
      data[i + 3] = density * 215;
    }
  }
  surface.ctx.putImageData(image, 0, 0);
  withState(ctx, () => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'blur(2px)';
    ctx.drawImage(surface.canvas, 0, 0, width, height);
  });
}
