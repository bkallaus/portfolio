import { type Point, distance } from './geometry';
import type { Track } from './track';

export type RacingLine = {
  points: Point[];
  lateral: number[];
  curvature: number[];
  segmentLengths: number[];
  arcLengths: number[];
  length: number;
};

export type LinePlan = {
  lanes: number;
  maxLaneStep: number;
  passes: number;
  stride: number;
  smoothing: number;
  edgeMargin: number;
  lateralGrip: number;
  topSpeed: number;
};

export const DEFAULT_PLAN: LinePlan = {
  lanes: 9,
  maxLaneStep: 2,
  passes: 4,
  stride: 5,
  smoothing: 6,
  edgeMargin: 10,
  lateralGrip: 520,
  topSpeed: 240,
};

export function curvatureThrough(previous: Point, current: Point, next: Point): number {
  const a = distance(previous, current);
  const b = distance(current, next);
  const c = distance(previous, next);
  if (a === 0 || b === 0 || c === 0) return 0;
  const doubleArea = Math.abs(
    (current.x - previous.x) * (next.y - previous.y) - (current.y - previous.y) * (next.x - previous.x),
  );
  return (2 * doubleArea) / (a * b * c);
}

export function corneringLimit(curvature: number, lateralGrip: number, topSpeed: number): number {
  if (curvature <= 1e-9) return topSpeed;
  return Math.min(topSpeed, Math.sqrt(lateralGrip / curvature));
}

function laneOffsets(track: Track, plan: LinePlan): number[] {
  const reach = Math.max(0, track.halfWidth - plan.edgeMargin);
  if (plan.lanes <= 1) return [0];
  return Array.from({ length: plan.lanes }, (_, lane) => -reach + (2 * reach * lane) / (plan.lanes - 1));
}

export function planRacingLine(track: Track, overrides: Partial<LinePlan> = {}): RacingLine {
  const plan = { ...DEFAULT_PLAN, ...overrides };
  const count = track.centerline.length;
  const { lanes } = plan;
  const offsets = laneOffsets(track, plan);
  const nodes = Math.max(12, Math.round(count / plan.stride));
  const sampleOf = (node: number) => Math.round(((node % nodes) * count) / nodes) % count;

  const pointAt = (node: number, lane: number): Point => {
    const index = sampleOf((node + nodes) % nodes);
    return {
      x: track.centerline[index].x + track.normals[index].x * offsets[lane],
      y: track.centerline[index].y + track.normals[index].y * offsets[lane],
    };
  };

  const stateCount = lanes * lanes;
  const totalLayers = plan.passes * nodes;
  const choice = new Uint8Array(totalLayers * stateCount);
  let cost = new Float64Array(stateCount);
  let nextCost = new Float64Array(stateCount);

  for (let layer = 0; layer < totalLayers; layer++) {
    const node = layer % nodes;
    nextCost.fill(Number.POSITIVE_INFINITY);
    for (let previous = 0; previous < lanes; previous++) {
      for (let current = 0; current < lanes; current++) {
        const soFar = cost[previous * lanes + current];
        if (!Number.isFinite(soFar)) continue;
        const from = pointAt(node + nodes - 1, previous);
        const here = pointAt(node, current);
        const lowest = Math.max(0, current - plan.maxLaneStep);
        const highest = Math.min(lanes - 1, current + plan.maxLaneStep);
        for (let ahead = lowest; ahead <= highest; ahead++) {
          const to = pointAt(node + 1, ahead);
          const speed = corneringLimit(curvatureThrough(from, here, to), plan.lateralGrip, plan.topSpeed);
          const total = soFar + distance(here, to) / speed;
          const slot = current * lanes + ahead;
          if (total < nextCost[slot]) {
            nextCost[slot] = total;
            choice[layer * stateCount + slot] = previous;
          }
        }
      }
    }
    const swap = cost;
    cost = nextCost;
    nextCost = swap;
  }

  let bestSlot = 0;
  for (let slot = 1; slot < stateCount; slot++) {
    if (cost[slot] < cost[bestSlot]) bestSlot = slot;
  }

  const chosen = new Int32Array(totalLayers + 1);
  let slot = bestSlot;
  for (let layer = totalLayers - 1; layer >= 0; layer--) {
    const current = Math.floor(slot / lanes);
    chosen[layer + 1] = slot % lanes;
    slot = choice[layer * stateCount + slot] * lanes + current;
  }
  chosen[0] = slot % lanes;

  const nodeOffset = new Float64Array(nodes);
  for (let layer = totalLayers - nodes + 1; layer <= totalLayers; layer++) {
    nodeOffset[layer % nodes] = offsets[chosen[layer]];
  }

  const lateral = spreadAcrossSamples(nodeOffset, nodes, count, sampleOf);
  const reach = Math.max(0, track.halfWidth - plan.edgeMargin);
  for (let pass = 0; pass < plan.smoothing; pass++) {
    smoothOffsets(lateral, reach);
  }

  const offsetPerSample = Array.from(lateral);
  const points: Point[] = offsetPerSample.map((offset, index) => ({
    x: track.centerline[index].x + track.normals[index].x * offset,
    y: track.centerline[index].y + track.normals[index].y * offset,
  }));
  const curvature = points.map((point, index) =>
    curvatureThrough(points[(index + count - 1) % count], point, points[(index + 1) % count]),
  );
  const segmentLengths = points.map((point, index) => distance(point, points[(index + 1) % count]));

  const arcLengths: number[] = [];
  let travelled = 0;
  for (const span of segmentLengths) {
    arcLengths.push(travelled);
    travelled += span;
  }

  return {
    points,
    lateral: offsetPerSample,
    curvature,
    segmentLengths,
    arcLengths,
    length: travelled,
  };
}

function spreadAcrossSamples(
  nodeOffset: Float64Array,
  nodes: number,
  count: number,
  sampleOf: (node: number) => number,
): Float64Array {
  const lateral = new Float64Array(count);
  for (let node = 0; node < nodes; node++) {
    const from = sampleOf(node);
    const to = sampleOf(node + 1);
    const span = (to - from + count) % count || count;
    for (let step = 0; step < span; step++) {
      const ratio = step / span;
      lateral[(from + step) % count] =
        nodeOffset[node] * (1 - ratio) + nodeOffset[(node + 1) % nodes] * ratio;
    }
  }
  return lateral;
}

function smoothOffsets(lateral: Float64Array, reach: number): void {
  const count = lateral.length;
  const source = Float64Array.from(lateral);
  for (let index = 0; index < count; index++) {
    const previous = source[(index + count - 1) % count];
    const next = source[(index + 1) % count];
    const blended = source[index] * 0.5 + (previous + next) * 0.25;
    lateral[index] = Math.min(reach, Math.max(-reach, blended));
  }
}

export type Capability = {
  topSpeed: number;
  acceleration: number;
  braking: number;
  lateralGrip: number;
};

export type Pace = {
  speeds: number[];
  lapTime: number;
};

export function paceLine(line: RacingLine, capability: Capability): Pace {
  const count = line.points.length;
  const speeds = line.curvature.map((curvature) =>
    corneringLimit(curvature, capability.lateralGrip, capability.topSpeed),
  );

  for (let sweep = 0; sweep < 2; sweep++) {
    for (let step = 0; step < count; step++) {
      const index = step % count;
      const ahead = (index + 1) % count;
      const reachable = Math.sqrt(speeds[index] ** 2 + 2 * capability.acceleration * line.segmentLengths[index]);
      if (reachable < speeds[ahead]) speeds[ahead] = reachable;
    }
  }

  for (let sweep = 0; sweep < 2; sweep++) {
    for (let step = count - 1; step >= 0; step--) {
      const index = step % count;
      const ahead = (index + 1) % count;
      const survivable = Math.sqrt(speeds[ahead] ** 2 + 2 * capability.braking * line.segmentLengths[index]);
      if (survivable < speeds[index]) speeds[index] = survivable;
    }
  }

  let lapTime = 0;
  for (let index = 0; index < count; index++) {
    const ahead = (index + 1) % count;
    lapTime += line.segmentLengths[index] / ((speeds[index] + speeds[ahead]) / 2);
  }

  return { speeds, lapTime };
}

export type LinePosition = { x: number; y: number; heading: number; index: number };

export function positionAtArc(line: RacingLine, arc: number): LinePosition {
  const count = line.points.length;
  const wrapped = ((arc % line.length) + line.length) % line.length;

  let low = 0;
  let high = count - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (line.arcLengths[middle] <= wrapped) low = middle;
    else high = middle - 1;
  }

  const next = (low + 1) % count;
  const span = line.segmentLengths[low] || 1;
  const ratio = (wrapped - line.arcLengths[low]) / span;
  const from = line.points[low];
  const to = line.points[next];

  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
    heading: Math.atan2(to.y - from.y, to.x - from.x),
    index: low,
  };
}

export function speedAtArc(line: RacingLine, pace: Pace, arc: number): number {
  const { index } = positionAtArc(line, arc);
  return pace.speeds[index];
}

export type TrackProfile = {
  flatOutShare: number;
  slowestCorner: number;
  cornerCount: number;
  label: string;
};

export function profileOf(pace: Pace, topSpeed: number): TrackProfile {
  const flatOut = pace.speeds.filter((speed) => speed >= topSpeed * 0.96).length / pace.speeds.length;
  const cornerThreshold = topSpeed * 0.8;

  let cornerCount = 0;
  let inside = false;
  for (const speed of pace.speeds) {
    if (speed < cornerThreshold && !inside) cornerCount += 1;
    inside = speed < cornerThreshold;
  }

  return {
    flatOutShare: flatOut,
    slowestCorner: Math.min(...pace.speeds),
    cornerCount,
    label: flatOut > 0.45 ? 'Fast' : flatOut > 0.2 ? 'Mixed' : 'Technical',
  };
}
