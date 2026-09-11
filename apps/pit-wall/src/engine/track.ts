import {
  type Bounds,
  type Point,
  boundsOf,
  catmullRomLoop,
  convexHull,
  distance,
  loopLength,
  fitLoopInside,
  loopSelfClearance,
  loopSelfIntersects,
  relaxTurns,
  smoothLoop,
  resampleLoop,
} from './geometry';
import { type Rng, between, createRng } from './rng';

export type Track = {
  seed: number;
  shape: Shape;
  centerline: Point[];
  normals: Point[];
  length: number;
  halfWidth: number;
  spacing: number;
  leftWall: Point[];
  rightWall: Point[];
  bounds: Bounds;
  start: { x: number; y: number; heading: number };
};

const FIELD_WIDTH = 1180;
const FIELD_HEIGHT = 760;
const FIELD_MARGIN = 110;
const SAMPLE_SPACING = 9;
const WIDEST_HALF_WIDTH = 38;
const CLEARANCE_RATIO = 2.2;
const REPAIR_PASSES = 5;
const GENERATION_ATTEMPTS = 24;

export type Shape = {
  twistiness: number;
  halfWidth: number;
  minimumCornerRadius: number;
  maximumTurn: number;
  separation: number;
  rounds: number[];
};

export function shapeFor(twistiness: number): Shape {
  const eased = Math.min(1, Math.max(0, twistiness));
  const halfWidth = WIDEST_HALF_WIDTH - eased * 12;
  return {
    twistiness: eased,
    halfWidth,
    minimumCornerRadius: halfWidth * (1.72 - eased * 0.5),
    maximumTurn: ((60 + eased * 30) * Math.PI) / 180,
    separation: 118 - eased * 30,
    rounds: eased < 0.5 ? [0.24 + eased * 0.2] : [0.3 + eased * 0.14, 0.22 + eased * 0.16],
  };
}

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

export function minimumSelfClearance(centerline: Point[], spacing: number, required: number): number {
  return loopSelfClearance(centerline, Math.ceil(required / spacing) + 4, required);
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

type Candidate = { control: Point[]; centerline: Point[]; score: number };

function drivabilityScore(centerline: Point[], control: Point[], shape: Shape): number {
  if (loopSelfIntersects(control)) return 0;
  return Math.min(
    minimumCornerRadius(centerline, SAMPLE_SPACING) / shape.minimumCornerRadius,
    minimumSelfClearance(centerline, SAMPLE_SPACING, shape.halfWidth * CLEARANCE_RATIO) /
      (shape.halfWidth * CLEARANCE_RATIO),
  );
}

function proposeCandidate(seed: number, shape: Shape): Candidate {
  const rng = createRng(seed);
  const scattered = scatterPoints(rng, 13 + Math.floor(rng() * 5));
  let control = pushApart(convexHull(scattered), 210, 14);
  for (const round of shape.rounds) {
    control = displaceMidpoints(control, rng, FIELD_HEIGHT * round);
    control = pushApart(control, shape.separation, 8);
    control = relaxTurns(control, shape.maximumTurn, 4);
  }
  control = fitToField(control);

  let best: Candidate = { control, centerline: buildCenterline(control), score: 0 };
  best.score = drivabilityScore(best.centerline, best.control, shape);

  for (let repair = 0; repair < REPAIR_PASSES && best.score < 1; repair++) {
    control = fitToField(smoothLoop(control, 0.35));
    const centerline = buildCenterline(control);
    const score = drivabilityScore(centerline, control, shape);
    if (score > best.score) best = { control, centerline, score };
  }

  return best;
}

function deriveSeed(seed: number, attempt: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(attempt + 1, 0xc2b2ae35)) >>> 0;
}

function findCandidate(seed: number, shape: Shape): Candidate {
  let best = proposeCandidate(seed, shape);
  for (let attempt = 0; attempt < GENERATION_ATTEMPTS && best.score < 1; attempt++) {
    const candidate = proposeCandidate(deriveSeed(seed, attempt), shape);
    if (candidate.score > best.score) best = candidate;
  }
  return best;
}

export function generateTrack(seed: number, twistiness?: number): Track {
  const requested = twistiness ?? createRng(seed ^ 0x5bf03635)();
  let shape = shapeFor(requested);
  let best = findCandidate(seed, shape);

  for (let relaxed = requested; best.score < 1 && relaxed > 0; ) {
    relaxed = Math.max(0, relaxed - 0.2);
    const gentler = shapeFor(relaxed);
    const candidate = findCandidate(seed, gentler);
    if (candidate.score > best.score) {
      best = candidate;
      shape = gentler;
    }
  }

  const { centerline } = best;
  const normals = normalsFor(centerline);
  const leftWall = offsetLoop(centerline, normals, -shape.halfWidth);
  const rightWall = offsetLoop(centerline, normals, shape.halfWidth);

  return {
    seed,
    shape,
    centerline,
    normals,
    length: loopLength(centerline),
    halfWidth: shape.halfWidth,
    spacing: SAMPLE_SPACING,
    leftWall,
    rightWall,
    bounds: boundsOf([...leftWall, ...rightWall]),
    start: {
      x: centerline[0].x,
      y: centerline[0].y,
      heading: Math.atan2(centerline[1].y - centerline[0].y, centerline[1].x - centerline[0].x),
    },
  };
}
