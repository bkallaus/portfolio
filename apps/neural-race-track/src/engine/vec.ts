export type Vec = { x: number; y: number };

export const vec = (x: number, y: number): Vec => ({ x, y });

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });

export const length = (a: Vec): number => Math.hypot(a.x, a.y);

export const normalize = (a: Vec): Vec => {
  const len = length(a);
  return len === 0 ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
};

export const perpendicular = (a: Vec): Vec => ({ x: -a.y, y: a.x });

export const fromAngle = (radians: number): Vec => ({ x: Math.cos(radians), y: Math.sin(radians) });

export const angleOf = (a: Vec): number => Math.atan2(a.y, a.x);

export const distanceToSegment = (point: Vec, a: Vec, b: Vec): number => {
  const ab = sub(b, a);
  const abLengthSquared = ab.x * ab.x + ab.y * ab.y;
  if (abLengthSquared === 0) return length(sub(point, a));
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * ab.x + (point.y - a.y) * ab.y) / abLengthSquared));
  return length(sub(point, add(a, scale(ab, t))));
};

export const raySegmentDistance = (
  origin: Vec,
  direction: Vec,
  a: Vec,
  b: Vec,
): number | null => {
  const segment = sub(b, a);
  const denominator = direction.x * segment.y - direction.y * segment.x;
  if (Math.abs(denominator) < 1e-9) return null;
  const originToA = sub(a, origin);
  const t = (originToA.x * segment.y - originToA.y * segment.x) / denominator;
  const u = (originToA.x * direction.y - originToA.y * direction.x) / denominator;
  if (t < 0 || u < 0 || u > 1) return null;
  return t;
};
