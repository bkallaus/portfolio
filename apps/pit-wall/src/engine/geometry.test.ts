import {
  catmullRomLoop,
  convexHull,
  loopLength,
  loopSelfIntersects,
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
