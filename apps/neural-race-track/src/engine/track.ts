import { createRng } from './rng';
import {
  add,
  angleOf,
  distanceToSegment,
  length,
  normalize,
  perpendicular,
  scale,
  sub,
  type Vec,
} from './vec';

export type Segment = { a: Vec; b: Vec };

export type StartPose = { position: Vec; heading: number };

export type Track = {
  seed: number;
  width: number;
  centerline: Vec[];
  cumulativeLength: number[];
  totalLength: number;
  leftWall: Vec[];
  rightWall: Vec[];
  wallSegments: Segment[];
  bounds: { min: Vec; max: Vec };
  start: StartPose;
};

const catmullRom = (p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec => {
  const t2 = t * t;
  const t3 = t2 * t;
  const compute = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: compute(p0.x, p1.x, p2.x, p3.x), y: compute(p0.y, p1.y, p2.y, p3.y) };
};

const controlPoints = (seed: number): Vec[] => {
  const rng = createRng(seed);
  const count = Math.round(rng.range(7, 11));
  const points: Vec[] = [];
  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    const jitter = rng.range(-0.25, 0.25) * ((Math.PI * 2) / count);
    const radius = rng.range(210, 330);
    const angle = baseAngle + jitter;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * rng.range(0.72, 1) });
  }
  return points;
};

const sampleLoop = (points: Vec[], perSegment: number): Vec[] => {
  const count = points.length;
  const sampled: Vec[] = [];
  for (let i = 0; i < count; i++) {
    const p0 = points[(i - 1 + count) % count];
    const p1 = points[i];
    const p2 = points[(i + 1) % count];
    const p3 = points[(i + 2) % count];
    for (let step = 0; step < perSegment; step++) {
      sampled.push(catmullRom(p0, p1, p2, p3, step / perSegment));
    }
  }
  return sampled;
};

const tangentAt = (points: Vec[], index: number): Vec => {
  const count = points.length;
  const before = points[(index - 1 + count) % count];
  const after = points[(index + 1) % count];
  return normalize(sub(after, before));
};

const buildWalls = (centerline: Vec[], halfWidth: number): { left: Vec[]; right: Vec[] } => {
  const left: Vec[] = [];
  const right: Vec[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const normal = perpendicular(tangentAt(centerline, i));
    left.push(add(centerline[i], scale(normal, halfWidth)));
    right.push(sub(centerline[i], scale(normal, halfWidth)));
  }
  return { left, right };
};

const closedSegments = (points: Vec[]): Segment[] => {
  const segments: Segment[] = [];
  for (let i = 0; i < points.length; i++) {
    segments.push({ a: points[i], b: points[(i + 1) % points.length] });
  }
  return segments;
};

const cumulativeLengths = (points: Vec[]): { cumulative: number[]; total: number } => {
  const cumulative: number[] = [0];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    total += length(sub(points[(i + 1) % points.length], points[i]));
    cumulative.push(total);
  }
  return { cumulative, total };
};

const boundsOf = (points: Vec[]): { min: Vec; max: Vec } => {
  const min = { x: Infinity, y: Infinity };
  const max = { x: -Infinity, y: -Infinity };
  for (const point of points) {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
  }
  return { min, max };
};

export const createTrack = (seed: number, width = 92): Track => {
  const halfWidth = width / 2;
  const centerline = sampleLoop(controlPoints(seed), 14);
  const { left, right } = buildWalls(centerline, halfWidth);
  const { cumulative, total } = cumulativeLengths(centerline);
  const wallSegments = [...closedSegments(left), ...closedSegments(right)];
  const bounds = boundsOf([...left, ...right]);
  const start: StartPose = {
    position: centerline[0],
    heading: angleOf(tangentAt(centerline, 0)),
  };
  return {
    seed,
    width,
    centerline,
    cumulativeLength: cumulative,
    totalLength: total,
    leftWall: left,
    rightWall: right,
    wallSegments,
    bounds,
    start,
  };
};

export type Progress = { distance: number; offset: number };

export const progressAt = (track: Track, point: Vec): Progress => {
  const { centerline, cumulativeLength } = track;
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < centerline.length; i++) {
    const distance = distanceToSegment(point, centerline[i], centerline[(i + 1) % centerline.length]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  const a = centerline[bestIndex];
  const b = centerline[(bestIndex + 1) % centerline.length];
  const segment = sub(b, a);
  const segmentLengthSquared = segment.x * segment.x + segment.y * segment.y;
  const t =
    segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((point.x - a.x) * segment.x + (point.y - a.y) * segment.y) / segmentLengthSquared));
  const along = cumulativeLength[bestIndex] + Math.sqrt(segmentLengthSquared) * t;
  return { distance: along, offset: bestDistance };
};

export const isOffTrack = (track: Track, point: Vec, margin: number): boolean =>
  progressAt(track, point).offset > track.width / 2 - margin;
