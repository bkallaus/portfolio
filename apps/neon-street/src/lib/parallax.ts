export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export type Pointer = { x: number; y: number };

export type Viewport = { width: number; height: number };

export function scrollProgress(scrollTop: number, scrollHeight: number, viewportHeight: number): number {
  const scrollable = scrollHeight - viewportHeight;
  return scrollable <= 0 ? 0 : clamp01(scrollTop / scrollable);
}
