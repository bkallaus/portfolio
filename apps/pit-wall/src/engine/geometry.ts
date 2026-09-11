export type Point = { x: number; y: number };
export type Segment = { ax: number; ay: number; bx: number; by: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function boundsOf(points: Point[]): Bounds {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const point of points) {
    bounds.minX = Math.min(bounds.minX, point.x);
    bounds.minY = Math.min(bounds.minY, point.y);
    bounds.maxX = Math.max(bounds.maxX, point.x);
    bounds.maxY = Math.max(bounds.maxY, point.y);
  }
  return bounds;
}

export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  if (sorted.length < 3) return sorted;

  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const build = (input: Point[]) => {
    const chain: Point[] = [];
    for (const point of input) {
      while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0) {
        chain.pop();
      }
      chain.push(point);
    }
    chain.pop();
    return chain;
  };

  return [...build(sorted), ...build([...sorted].reverse())];
}

export function catmullRomLoop(control: Point[], samplesPerSpan: number): Point[] {
  const count = control.length;
  const samples: Point[] = [];
  for (let i = 0; i < count; i++) {
    const p0 = control[(i - 1 + count) % count];
    const p1 = control[i];
    const p2 = control[(i + 1) % count];
    const p3 = control[(i + 2) % count];
    for (let step = 0; step < samplesPerSpan; step++) {
      const t = step / samplesPerSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      samples.push({
        x:
          0.5 *
          (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return samples;
}

export function loopLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    total += distance(points[i], points[(i + 1) % points.length]);
  }
  return total;
}

export function resampleLoop(points: Point[], spacing: number): Point[] {
  const total = loopLength(points);
  const count = Math.max(3, Math.round(total / spacing));
  const step = total / count;
  const resampled: Point[] = [];
  let index = 0;
  let cursor = { ...points[0] };

  for (let emitted = 0; emitted < count; emitted++) {
    resampled.push({ ...cursor });
    let remaining = step;
    while (remaining > 0) {
      const next = points[(index + 1) % points.length];
      const span = Math.hypot(next.x - cursor.x, next.y - cursor.y);
      if (span > remaining) {
        const ratio = remaining / span;
        cursor = {
          x: cursor.x + (next.x - cursor.x) * ratio,
          y: cursor.y + (next.y - cursor.y) * ratio,
        };
        remaining = 0;
      } else {
        remaining -= span;
        cursor = { ...next };
        index += 1;
      }
    }
  }
  return resampled;
}

export function smoothLoop(points: Point[], strength: number): Point[] {
  const count = points.length;
  return points.map((point, i) => {
    const previous = points[(i - 1 + count) % count];
    const next = points[(i + 1) % count];
    return {
      x: point.x + strength * ((previous.x + next.x) / 2 - point.x),
      y: point.y + strength * ((previous.y + next.y) / 2 - point.y),
    };
  });
}

export function normalizeAngle(angle: number): number {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= 2 * Math.PI;
  while (wrapped < -Math.PI) wrapped += 2 * Math.PI;
  return wrapped;
}

export function relaxTurns(points: Point[], maxTurn: number, passes: number): Point[] {
  const relaxed = points.map((point) => ({ ...point }));
  const count = relaxed.length;
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < count; i++) {
      const previous = relaxed[(i - 1 + count) % count];
      const current = relaxed[i];
      const nextIndex = (i + 1) % count;
      const next = relaxed[nextIndex];
      const incoming = Math.atan2(current.y - previous.y, current.x - previous.x);
      const outgoing = Math.atan2(next.y - current.y, next.x - current.x);
      const turn = normalizeAngle(outgoing - incoming);
      if (Math.abs(turn) <= maxTurn) continue;
      const corrected = incoming + Math.sign(turn) * maxTurn;
      const span = distance(current, next);
      relaxed[nextIndex] = {
        x: current.x + Math.cos(corrected) * span,
        y: current.y + Math.sin(corrected) * span,
      };
    }
  }
  return relaxed;
}

export function fitLoopInside(points: Point[], width: number, height: number, margin: number): Point[] {
  const bounds = boundsOf(points);
  const spanX = bounds.maxX - bounds.minX || 1;
  const spanY = bounds.maxY - bounds.minY || 1;
  const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanY);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return points.map((point) => ({
    x: width / 2 + (point.x - centerX) * scale,
    y: height / 2 + (point.y - centerY) * scale,
  }));
}

export function segmentsIntersect(a: Segment, b: Segment): boolean {
  const orient = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  const o1 = orient(a.ax, a.ay, a.bx, a.by, b.ax, b.ay);
  const o2 = orient(a.ax, a.ay, a.bx, a.by, b.bx, b.by);
  const o3 = orient(b.ax, b.ay, b.bx, b.by, a.ax, a.ay);
  const o4 = orient(b.ax, b.ay, b.bx, b.by, a.bx, a.by);
  return o1 !== o2 && o3 !== o4;
}

export function loopSelfIntersects(points: Point[]): boolean {
  const count = points.length;
  const edge = (i: number): Segment => ({
    ax: points[i].x,
    ay: points[i].y,
    bx: points[(i + 1) % count].x,
    by: points[(i + 1) % count].y,
  });
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      if (i === 0 && j === count - 1) continue;
      if (segmentsIntersect(edge(i), edge(j))) return true;
    }
  }
  return false;
}

export function loopSelfClearance(points: Point[], minimumIndexGap: number, cellSize: number): number {
  const count = points.length;
  const buckets = new Map<string, number[]>();
  points.forEach((point, index) => {
    const key = `${Math.floor(point.x / cellSize)},${Math.floor(point.y / cellSize)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(index);
    else buckets.set(key, [index]);
  });

  let closest = Infinity;
  points.forEach((point, index) => {
    const cellX = Math.floor(point.x / cellSize);
    const cellY = Math.floor(point.y / cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = buckets.get(`${cellX + dx},${cellY + dy}`);
        if (!bucket) continue;
        for (const other of bucket) {
          const gap = Math.abs(other - index);
          if (Math.min(gap, count - gap) < minimumIndexGap) continue;
          closest = Math.min(closest, distance(point, points[other]));
        }
      }
    }
  });
  return closest;
}
