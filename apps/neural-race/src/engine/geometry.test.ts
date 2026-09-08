import {
  castRay,
  catmullRomLoop,
  convexHull,
  createSegmentIndex,
  loopLength,
  loopSelfIntersects,
  projectOntoSegment,
  resampleLoop,
} from './geometry';

describe('convexHull', () => {
  it('drops interior points and keeps the corners', () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 5 },
    ]);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 5, y: 5 });
  });
});

describe('resampleLoop', () => {
  it('spaces points evenly around a square', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 120 },
      { x: 0, y: 120 },
    ];
    const resampled = resampleLoop(square, 10);
    expect(resampled).toHaveLength(48);
    expect(loopLength(resampled)).toBeCloseTo(480, 0);
  });
});

describe('catmullRomLoop', () => {
  it('passes through every control point', () => {
    const control = [
      { x: 0, y: 0 },
      { x: 100, y: 20 },
      { x: 80, y: 90 },
      { x: -10, y: 70 },
    ];
    const samples = catmullRomLoop(control, 8);
    expect(samples).toHaveLength(32);
    for (const point of control) {
      expect(samples).toContainEqual({ x: point.x, y: point.y });
    }
  });
});

describe('loopSelfIntersects', () => {
  it('accepts a simple loop and rejects a crossed one', () => {
    const simple = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const crossed = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];
    expect(loopSelfIntersects(simple)).toBe(false);
    expect(loopSelfIntersects(crossed)).toBe(true);
  });
});

describe('projectOntoSegment', () => {
  it('clamps to the segment ends', () => {
    const segment = { ax: 0, ay: 0, bx: 10, by: 0 };
    expect(projectOntoSegment(5, 3, segment)).toMatchObject({ x: 5, y: 0, distance: 3 });
    expect(projectOntoSegment(-8, 0, segment)).toMatchObject({ x: 0, y: 0, t: 0 });
    expect(projectOntoSegment(99, 0, segment)).toMatchObject({ x: 10, y: 0, t: 1 });
  });
});

describe('castRay', () => {
  const index = createSegmentIndex([
    { ax: 100, ay: -50, bx: 100, by: 50 },
    { ax: -50, ay: 200, bx: 50, by: 200 },
  ]);

  it('measures the distance to the first wall hit', () => {
    expect(castRay(index, 0, 0, 1, 0, 500)).toBeCloseTo(100);
  });

  it('returns the full range when nothing is hit', () => {
    expect(castRay(index, 0, 0, -1, 0, 500)).toBe(500);
  });

  it('ignores walls beyond the sensor range', () => {
    expect(castRay(index, 0, 0, 1, 0, 60)).toBe(60);
  });

  it('does not report walls behind the ray origin', () => {
    expect(castRay(index, 200, 0, 1, 0, 500)).toBe(500);
  });
});
