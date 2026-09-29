import type { Noise2D } from '../lib/noise';
import type { Rng } from '../lib/rng';
import type { Ctx } from './canvas';

export type LayerFrame = {
  ctx: Ctx;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  margin: number;
  groundY: number;
  rng: Rng;
  noise: Noise2D;
};

export type LayerPainter = (frame: LayerFrame) => void;

export const vh = (frame: LayerFrame, fraction: number): number => frame.viewportHeight * fraction;

export const vw = (frame: LayerFrame, fraction: number): number => frame.viewportWidth * fraction;
