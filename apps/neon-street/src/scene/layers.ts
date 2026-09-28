import { paintDistrict } from './district';
import { paintForeground } from './foreground';
import type { LayerPainter } from './frame';
import { paintSky } from './sky';
import { paintFarSkyline, paintTowers } from './skyline';
import { paintStreet } from './street';

export type LayerSpec = {
  id: string;
  depth: number;
  horizon: number;
  seed: number;
  bloom: number;
  paint: LayerPainter;
};

export const BACKDROP: LayerSpec[] = [
  { id: 'sky', bloom: 0, depth: 0.04, horizon: 0.7, seed: 11, paint: paintSky },
  { id: 'skyline', bloom: 0.35, depth: 0.14, horizon: 0.66, seed: 23, paint: paintFarSkyline },
  { id: 'towers', bloom: 0.45, depth: 0.28, horizon: 0.69, seed: 37, paint: paintTowers },
  { id: 'district', bloom: 0.5, depth: 0.48, horizon: 0.72, seed: 41, paint: paintDistrict },
];

export const STREETSCAPE: LayerSpec[] = [
  { id: 'street', bloom: 0.45, depth: 0.75, horizon: 0.74, seed: 53, paint: paintStreet },
  { id: 'foreground', bloom: 0.25, depth: 1, horizon: 1, seed: 67, paint: paintForeground },
];
