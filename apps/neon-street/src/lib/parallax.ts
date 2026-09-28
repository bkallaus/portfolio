export const CRANE_TRAVEL = 1.25;

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export type Pointer = { x: number; y: number };

export type Viewport = { width: number; height: number };

export const swayMargin = (viewport: Viewport): number => Math.round(Math.max(24, viewport.width * 0.035));

export function layerSize(viewport: Viewport, depth: number): Viewport {
  const margin = swayMargin(viewport);
  return {
    width: viewport.width + margin * 2,
    height: Math.ceil(viewport.height * (1 + CRANE_TRAVEL * depth)) + margin * 2,
  };
}

export function scrollProgress(scrollTop: number, scrollHeight: number, viewportHeight: number): number {
  const scrollable = scrollHeight - viewportHeight;
  return scrollable <= 0 ? 0 : clamp01(scrollTop / scrollable);
}

export function layerOffset(progress: number, depth: number, viewport: Viewport, pointer: Pointer): Pointer {
  const margin = swayMargin(viewport);
  const sway = margin * 0.9 * depth;
  return {
    x: -margin - pointer.x * sway,
    y: -margin - clamp01(progress) * CRANE_TRAVEL * depth * viewport.height - pointer.y * sway,
  };
}

export const altitudeAt = (progress: number, topMeters = 212, streetMeters = 1.6): number =>
  topMeters + (streetMeters - topMeters) * clamp01(progress);
