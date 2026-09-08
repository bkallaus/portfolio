import { castRay, distance, loopSelfIntersects } from './geometry';
import { generateTrack, locateOnTrack, minimumCornerRadius } from './track';

const seeds = Array.from({ length: 25 }, (_, i) => i * 7919 + 13);

describe('generateTrack', () => {
  it('is deterministic for a seed and varies across seeds', () => {
    expect(generateTrack(99).centerline).toEqual(generateTrack(99).centerline);
    expect(generateTrack(99).centerline).not.toEqual(generateTrack(100).centerline);
  });

  it.each(seeds)('seed %i produces a closed, non-crossing loop', (seed) => {
    const track = generateTrack(seed);
    expect(track.centerline.length).toBeGreaterThan(60);
    expect(loopSelfIntersects(track.centerline)).toBe(false);
    expect(track.length).toBeGreaterThan(900);
  });

  it.each(seeds)('seed %i keeps every corner wider than the walls are thick', (seed) => {
    const track = generateTrack(seed);
    expect(minimumCornerRadius(track.centerline, track.spacing)).toBeGreaterThan(track.halfWidth);
  });

  it.each(seeds)('seed %i fills the field without leaving it', (seed) => {
    const { bounds } = generateTrack(seed);
    expect(bounds.maxX - bounds.minX).toBeGreaterThan(700);
    expect(bounds.minX).toBeGreaterThan(0);
    expect(bounds.minY).toBeGreaterThan(0);
  });

  it.each(seeds)('seed %i spaces the walls a full track width apart', (seed) => {
    const track = generateTrack(seed);
    for (let i = 0; i < track.centerline.length; i++) {
      expect(distance(track.centerline[i], track.leftWall[i])).toBeCloseTo(track.halfWidth, 6);
      expect(distance(track.centerline[i], track.rightWall[i])).toBeCloseTo(track.halfWidth, 6);
    }
  });

  it.each(seeds)('seed %i leaves the racing line clear of walls', (seed) => {
    const track = generateTrack(seed);
    for (let i = 0; i < track.centerline.length; i += 3) {
      const point = track.centerline[i];
      for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const reach = castRay(track.wallIndex, point.x, point.y, Math.cos(angle), Math.sin(angle), 400);
        expect(reach).toBeGreaterThan(6);
      }
    }
  });

  it('starts the grid on the centerline pointing down the track', () => {
    const track = generateTrack(555);
    const location = locateOnTrack(track, track.start.x, track.start.y, -1);
    expect(Math.abs(location.lateral)).toBeLessThan(1);
    const ahead = castRay(
      track.wallIndex,
      track.start.x,
      track.start.y,
      Math.cos(track.start.heading),
      Math.sin(track.start.heading),
      400,
    );
    expect(ahead).toBeGreaterThan(track.halfWidth);
  });
});

describe('locateOnTrack', () => {
  const track = generateTrack(31337);

  it('reports the lateral offset from the centerline', () => {
    const index = 40;
    const point = track.centerline[index];
    const normal = track.normals[index];
    const offset = 12;
    const located = locateOnTrack(track, point.x + normal.x * offset, point.y + normal.y * offset, index);
    expect(Math.abs(located.lateral)).toBeCloseTo(offset, 1);
  });

  it('measures arc length that grows around the lap', () => {
    const far = Math.floor(track.centerline.length / 2);
    const early = locateOnTrack(track, track.centerline[10].x, track.centerline[10].y, 10);
    const late = locateOnTrack(track, track.centerline[far].x, track.centerline[far].y, far);
    expect(late.arc).toBeGreaterThan(early.arc);
    expect(late.arc).toBeLessThanOrEqual(track.length);
  });

  it('finds the position on the lap without a hint', () => {
    const index = Math.floor(track.centerline.length * 0.7);
    const target = track.centerline[index];
    const located = locateOnTrack(track, target.x, target.y, -1);
    expect(located.arc).toBeCloseTo(track.arcLengths[index], 3);
    expect(Math.abs(located.lateral)).toBeLessThan(0.001);
  });
});
