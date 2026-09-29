import { clamp01, type Pointer, type Viewport } from './parallax';

export type Camera = {
  x: number;
  y: number;
  z: number;
  focal: number;
  cx: number;
  cy: number;
};

export type Projection = { x: number; y: number; scale: number; depth: number };

export const NEAR = 0.25;
export const ROOFTOP_HEIGHT = 38;
export const EYE_HEIGHT = 1.65;
export const START_Z = -4;
export const END_Z = 150;
export const HORIZON = 0.46;

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const focalLength = (viewport: Viewport): number => Math.max(viewport.width, viewport.height * 0.9) * 0.36;

export function cameraAt(progress: number, viewport: Viewport, pointer: Pointer = { x: 0, y: 0 }): Camera {
  const p = clamp01(progress);
  return {
    x: pointer.x * 1.2,
    y: ROOFTOP_HEIGHT + (EYE_HEIGHT - ROOFTOP_HEIGHT) * easeInOut(p),
    z: START_Z + (END_Z - START_Z) * p,
    focal: focalLength(viewport),
    cx: viewport.width / 2,
    cy: viewport.height * HORIZON - pointer.y * 14,
  };
}

export const altitudeAt = (progress: number): number => cameraAt(progress, { width: 1, height: 1 }).y;

export function project(camera: Camera, x: number, y: number, z: number): Projection | null {
  const depth = z - camera.z;
  if (depth <= NEAR) return null;
  const scale = camera.focal / depth;
  return { x: camera.cx + (x - camera.x) * scale, y: camera.cy - (y - camera.y) * scale, scale, depth };
}

export function wallDepth(camera: Camera, screenX: number, wallX: number): number | null {
  const direction = (screenX - camera.cx) / camera.focal;
  if (direction === 0) return null;
  const depth = (wallX - camera.x) / direction;
  return depth > 0 ? depth : null;
}

export function groundDepth(camera: Camera, screenY: number): number | null {
  const drop = screenY - camera.cy;
  if (drop <= 0 || camera.y <= 0) return null;
  return (camera.focal * camera.y) / drop;
}
