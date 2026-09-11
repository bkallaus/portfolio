import {
  corneringLimit,
  curvatureThrough,
  paceLine,
  planRacingLine,
  positionAtArc,
  profileOf,
} from './racingLine';
import { capabilityOf } from './setup';
import { generateTrack } from './track';

const track = generateTrack(9182);
const line = planRacingLine(track);
const capability = capabilityOf({ power: 60, brakes: 60, grip: 60, topEnd: 60 });

describe('curvatureThrough', () => {
  it('is zero along a straight', () => {
    expect(curvatureThrough({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 })).toBeCloseTo(0);
  });

  it('matches the reciprocal of a known circle radius', () => {
    const radius = 50;
    const pointAt = (angle: number) => ({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    const curvature = curvatureThrough(pointAt(-0.2), pointAt(0), pointAt(0.2));
    expect(curvature).toBeCloseTo(1 / radius, 4);
  });
});

describe('corneringLimit', () => {
  it('allows top speed on a straight', () => {
    expect(corneringLimit(0, 500, 300)).toBe(300);
  });

  it('slows for tighter corners', () => {
    const open = corneringLimit(1 / 200, 500, 300);
    const tight = corneringLimit(1 / 40, 500, 300);
    expect(tight).toBeLessThan(open);
    expect(tight).toBeCloseTo(Math.sqrt(500 * 40));
  });

  it('never exceeds the car top speed', () => {
    expect(corneringLimit(1 / 5000, 900, 240)).toBe(240);
  });
});

describe('planRacingLine', () => {
  it('returns one point per centerline sample', () => {
    expect(line.points).toHaveLength(track.centerline.length);
    expect(line.curvature).toHaveLength(track.centerline.length);
    expect(line.arcLengths).toHaveLength(track.centerline.length);
  });

  it('keeps every point inside the track walls', () => {
    for (const offset of line.lateral) {
      expect(Math.abs(offset)).toBeLessThanOrEqual(track.halfWidth);
    }
  });

  it('uses the width of the track rather than hugging one edge', () => {
    const spread = Math.max(...line.lateral) - Math.min(...line.lateral);
    expect(spread).toBeGreaterThan(track.halfWidth);
  });

  it('is shorter than the centerline because it cuts the corners', () => {
    expect(line.length).toBeLessThan(track.length);
  });

  it('is deterministic for a track', () => {
    expect(planRacingLine(track).lateral).toEqual(line.lateral);
  });

  it('accumulates arc length in order', () => {
    for (let index = 1; index < line.arcLengths.length; index++) {
      expect(line.arcLengths[index]).toBeGreaterThan(line.arcLengths[index - 1]);
    }
    expect(line.arcLengths[line.arcLengths.length - 1]).toBeLessThan(line.length);
  });
});

describe('positionAtArc', () => {
  it('starts at the first point of the line', () => {
    const start = positionAtArc(line, 0);
    expect(start.x).toBeCloseTo(line.points[0].x, 6);
    expect(start.y).toBeCloseTo(line.points[0].y, 6);
  });

  it('wraps around the lap', () => {
    const start = positionAtArc(line, 0);
    const wrapped = positionAtArc(line, line.length);
    expect(wrapped.x).toBeCloseTo(start.x, 6);
    expect(wrapped.y).toBeCloseTo(start.y, 6);
  });

  it('handles arcs before the start line', () => {
    const behind = positionAtArc(line, -20);
    expect(Number.isFinite(behind.x)).toBe(true);
    expect(Number.isFinite(behind.heading)).toBe(true);
  });

  it('advances monotonically around a lap', () => {
    const quarter = positionAtArc(line, line.length * 0.25);
    const half = positionAtArc(line, line.length * 0.5);
    expect(half.index).toBeGreaterThan(quarter.index);
  });
});

describe('paceLine', () => {
  const pace = paceLine(line, capability);

  it('never exceeds the car top speed and never stops', () => {
    for (const speed of pace.speeds) {
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThanOrEqual(capability.topSpeed + 1e-6);
    }
  });

  it('reports a lap time consistent with distance and speed', () => {
    expect(pace.lapTime).toBeGreaterThan(line.length / capability.topSpeed);
    expect(pace.lapTime).toBeLessThan(line.length / Math.min(...pace.speeds));
  });

  it('goes faster when the car is given more of everything', () => {
    const better = capabilityOf({ power: 100, brakes: 100, grip: 100, topEnd: 100 });
    expect(paceLine(line, better).lapTime).toBeLessThan(pace.lapTime);
  });

  it('respects braking by slowing before a corner, not at it', () => {
    const slowest = pace.speeds.indexOf(Math.min(...pace.speeds));
    const approach = pace.speeds[(slowest - 4 + pace.speeds.length) % pace.speeds.length];
    expect(approach).toBeGreaterThan(pace.speeds[slowest]);
  });

  it('gives a grippier car higher corner speeds', () => {
    const grippy = capabilityOf({ power: 60, brakes: 60, grip: 100, topEnd: 20 });
    expect(Math.min(...paceLine(line, grippy).speeds)).toBeGreaterThan(Math.min(...pace.speeds));
  });
});

describe('profileOf', () => {
  it('describes a circuit the player can read', () => {
    const profile = profileOf(paceLine(line, capability), capability.topSpeed);
    expect(profile.flatOutShare).toBeGreaterThanOrEqual(0);
    expect(profile.flatOutShare).toBeLessThanOrEqual(1);
    expect(profile.cornerCount).toBeGreaterThanOrEqual(0);
    expect(['Fast', 'Mixed', 'Technical']).toContain(profile.label);
  });

  it('calls a circuit with no slow corners fast', () => {
    const profile = profileOf({ speeds: Array(50).fill(300), lapTime: 10 }, 300);
    expect(profile.flatOutShare).toBe(1);
    expect(profile.cornerCount).toBe(0);
    expect(profile.label).toBe('Fast');
  });
});
