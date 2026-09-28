import { createValueNoise } from '../lib/noise';
import { layerSize, swayMargin, type Viewport } from '../lib/parallax';
import { createRng } from '../lib/rng';
import { bloom } from './canvas';
import type { LayerSpec } from './layers';

const PIXEL_BUDGET = 10_000_000;

export function pixelRatioFor(width: number, height: number, devicePixelRatio: number): number {
  const wanted = Math.min(devicePixelRatio || 1, 1.5);
  return Math.min(wanted, Math.sqrt(PIXEL_BUDGET / (width * height)));
}

export function paintLayer(canvas: HTMLCanvasElement, spec: LayerSpec, viewport: Viewport, devicePixelRatio: number): void {
  const size = layerSize(viewport, spec.depth);
  const margin = swayMargin(viewport);
  const ratio = pixelRatioFor(size.width, size.height, devicePixelRatio);
  canvas.width = Math.round(size.width * ratio);
  canvas.height = Math.round(size.height * ratio);
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  spec.paint({
    ctx,
    width: size.width,
    height: size.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    margin,
    groundY: size.height - margin - viewport.height * (1 - spec.horizon),
    rng: createRng(spec.seed),
    noise: createValueNoise(spec.seed),
  });
  if (spec.bloom > 0) bloom(ctx, size.width, size.height, 10, spec.bloom);
}
