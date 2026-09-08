import {
  type Bounds,
  type Point,
  type Segment,
  type SegmentIndex,
  boundsOf,
  catmullRomLoop,
  convexHull,
  createSegmentIndex,
  distance,
  loopLength,
  fitLoopInside,
  loopSelfClearance,
  loopSelfIntersects,
  projectOntoSegment,
  relaxTurns,
  smoothLoop,
  resampleLoop,
} from './geometry';
import { type Rng, between, createRng } from './rng';

export type Track = {
  seed: number;
  centerline: Point[];
  normals: Point[];
  arcLengths: number[];
  length: number;
  halfWidth: number;
  spacing: number;
  leftWall: Point[];
  rightWall: Point[];
  walls: Segment[];
  wallIndex: SegmentIndex;
  bounds: Bounds;
  start: { x: number; y: number; heading: number };
};

const FIELD_WIDTH = 1180;
const FIELD_HEIGHT = 760;
const FIELD_MARGIN = 110;
const SAMPLE_SPACING = 9;
const HALF_WIDTH = 38;
const MINIMUM_CORNER_RADIUS = HALF_WIDTH * 1.35;
const MINIMUM_CLEARANCE = HALF_WIDTH * 2.5;
const REPAIR_PASSES = 5;
const GENERATION_ATTEMPTS = 24;
const MAXIMUM_TURN = (72 * Math.PI) / 180;

function scatterPoints(rng: Rng, count: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: between(rng, FIELD_MARGIN, FIELD_WIDTH - FIELD_MARGIN),
      y: between(rng, FIELD_MARGIN, FIELD_HEIGHT - FIELD_MARGIN),
    });
  }
  return points;
}

function pushApart(points: Point[], minimumDistance: number, iterations: number): Point[] {
  const spread = points.map((point) => ({ ...point }));
  for (let pass = 0; pass < iterations; pass++) {
    for (let i = 0; i < spread.length; i++) {
      for (let j = i + 1; j < spread.length; j++) {
        const gap = distance(spread[i], spread[j]);
        if (gap >= minimumDistance || gap === 0) continue;
        const push = (minimumDistance - gap) / 2;
        const dx = ((spread[j].x - spread[i].x) / gap) * push;
        const dy = ((spread[j].y - spread[i].y) / gap) * push;
        spread[i].x -= dx;
        spread[i].y -= dy;
        spread[j].x += dx;
        spread[j].y += dy;
      }
    }
    for (const point of spread) {
      point.x = Math.min(FIELD_WIDTH - FIELD_MARGIN, Math.max(FIELD_MARGIN, point.x));
      point.y = Math.min(FIELD_HEIGHT - FIELD_MARGIN, Math.max(FIELD_MARGIN, point.y));
    }
  }
  return spread;
}

function displaceMidpoints(points: Point[], rng: Rng, maximumOffset: number): Point[] {
  const displaced: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const span = distance(current, next);
    const offset = between(rng, -1, 1) * Math.min(maximumOffset, span * 0.5);
    displaced.push(current);
    displaced.push({
      x: (current.x + next.x) / 2 - ((next.y - current.y) / span) * offset,
      y: (current.y + next.y) / 2 + ((next.x - current.x) / span) * offset,
    });
  }
  return displaced;
}

const CURVATURE_STRIDE = 4;

export function minimumCornerRadius(centerline: Point[], spacing: number): number {
  const count = centerline.length;
  const baseline = spacing * CURVATURE_STRIDE;
  let smallest = Infinity;
  for (let i = 0; i < count; i++) {
    const previous = centerline[(i - CURVATURE_STRIDE + count * 2) % count];
    const current = centerline[i];
    const next = centerline[(i + CURVATURE_STRIDE) % count];
    const incoming = Math.atan2(current.y - previous.y, current.x - previous.x);
    const outgoing = Math.atan2(next.y - current.y, next.x - current.x);
    let turn = Math.abs(outgoing - incoming);
    if (turn > Math.PI) turn = 2 * Math.PI - turn;
    if (turn < 1e-6) continue;
    smallest = Math.min(smallest, baseline / turn);
  }
  return smallest;
}

export function minimumSelfClearance(centerline: Point[], spacing: number): number {
  return loopSelfClearance(centerline, Math.ceil(MINIMUM_CLEARANCE / spacing) + 4, MINIMUM_CLEARANCE);
}

function fitToField(points: Point[]): Point[] {
  return fitLoopInside(points, FIELD_WIDTH, FIELD_HEIGHT, FIELD_MARGIN);
}

function buildCenterline(control: Point[]): Point[] {
  return resampleLoop(catmullRomLoop(control, 14), SAMPLE_SPACING);
}

function normalsFor(centerline: Point[]): Point[] {
  const count = centerline.length;
  return centerline.map((_, i) => {
    const previous = centerline[(i - 1 + count) % count];
    const next = centerline[(i + 1) % count];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    return { x: -dy / magnitude, y: dx / magnitude };
  });
}

function offsetLoop(centerline: Point[], normals: Point[], amount: number): Point[] {
  return centerline.map((point, i) => ({
    x: point.x + normals[i].x * amount,
    y: point.y + normals[i].y * amount,
  }));
}

function wallSegments(loops: Point[][]): Segment[] {
  const segments: Segment[] = [];
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const next = loop[(i + 1) % loop.length];
      segments.push({ ax: loop[i].x, ay: loop[i].y, bx: next.x, by: next.y });
    }
  }
  return segments;
}

type Candidate = { control: Point[]; centerline: Point[]; score: number };

function drivabilityScore(centerline: Point[], control: Point[]): number {
  if (loopSelfIntersects(control)) return 0;
  return Math.min(
    minimumCornerRadius(centerline, SAMPLE_SPACING) / MINIMUM_CORNER_RADIUS,
    minimumSelfClearance(centerline, SAMPLE_SPACING) / MINIMUM_CLEARANCE,
  );
}

function proposeCandidate(seed: number): Candidate {
  const rng = createRng(seed);
  const scattered = scatterPoints(rng, 13 + Math.floor(rng() * 5));
  let control = pushApart(convexHull(scattered), 210, 14);
  for (const round of [0.42, 0.34]) {
    control = displaceMidpoints(control, rng, FIELD_HEIGHT * round);
    control = pushApart(control, 96, 8);
    control = relaxTurns(control, MAXIMUM_TURN, 4);
  }
  control = fitToField(control);

  let best: Candidate = { control, centerline: buildCenterline(control), score: 0 };
  best.score = drivabilityScore(best.centerline, best.control);

  for (let repair = 0; repair < REPAIR_PASSES && best.score < 1; repair++) {
    control = fitToField(smoothLoop(control, 0.35));
    const centerline = buildCenterline(control);
    const score = drivabilityScore(centerline, control);
    if (score > best.score) best = { control, centerline, score };
  }

  return best;
}

function deriveSeed(seed: number, attempt: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(attempt + 1, 0xc2b2ae35)) >>> 0;
}

export function generateTrack(seed: number): Track {
  let best = proposeCandidate(seed);
  for (let attempt = 0; attempt < GENERATION_ATTEMPTS && best.score < 1; attempt++) {
    const candidate = proposeCandidate(deriveSeed(seed, attempt));
    if (candidate.score > best.score) best = candidate;
  }

  const { centerline } = best;
  const normals = normalsFor(centerline);
  const leftWall = offsetLoop(centerline, normals, -HALF_WIDTH);
  const rightWall = offsetLoop(centerline, normals, HALF_WIDTH);
  const walls = wallSegments([leftWall, rightWall]);

  const arcLengths: number[] = [];
  let travelled = 0;
  for (let i = 0; i < centerline.length; i++) {
    arcLengths.push(travelled);
    travelled += distance(centerline[i], centerline[(i + 1) % centerline.length]);
  }

  return {
    seed,
    centerline,
    normals,
    arcLengths,
    length: loopLength(centerline),
    halfWidth: HALF_WIDTH,
    spacing: SAMPLE_SPACING,
    leftWall,
    rightWall,
    walls,
    wallIndex: createSegmentIndex(walls),
    bounds: boundsOf([...leftWall, ...rightWall]),
    start: {
      x: centerline[0].x,
      y: centerline[0].y,
      heading: Math.atan2(centerline[1].y - centerline[0].y, centerline[1].x - centerline[0].x),
    },
  };
}

export type TrackLocation = { index: number; lateral: number; arc: number };

export function locateOnTrack(track: Track, x: number, y: number, hint: number): TrackLocation {
  const count = track.centerline.length;
  const window = hint < 0 ? count : 30;
  const from = hint < 0 ? 0 : hint - 6;

  let bestIndex = 0;
  let bestDistance = Infinity;
  let bestT = 0;

  for (let step = 0; step < window; step++) {
    const index = ((from + step) % count + count) % count;
    const next = track.centerline[(index + 1) % count];
    const projection = projectOntoSegment(x, y, {
      ax: track.centerline[index].x,
      ay: track.centerline[index].y,
      bx: next.x,
      by: next.y,
    });
    if (projection.distance < bestDistance) {
      bestDistance = projection.distance;
      bestIndex = index;
      bestT = projection.t;
    }
  }

  const next = track.centerline[(bestIndex + 1) % count];
  const segmentLength = distance(track.centerline[bestIndex], next);
  const normal = track.normals[bestIndex];
  const side = Math.sign((x - track.centerline[bestIndex].x) * normal.x + (y - track.centerline[bestIndex].y) * normal.y);

  return {
    index: bestIndex,
    lateral: bestDistance * (side || 1),
    arc: track.arcLengths[bestIndex] + segmentLength * bestT,
  };
}
