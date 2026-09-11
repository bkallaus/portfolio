import { distance, loopSelfIntersects } from './geometry';
import { generateTrack, minimumCornerRadius, minimumSelfClearance, shapeFor } from './track';

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

  it.each(seeds)('seed %i keeps the corridor clear of its own walls', (seed) => {
    const track = generateTrack(seed);
    const clearance = minimumSelfClearance(track.centerline, track.spacing, track.halfWidth * 2.2);
    expect(clearance).toBeGreaterThan(track.halfWidth * 2);
  });

  it('starts the grid on the centerline pointing down the track', () => {
    const track = generateTrack(555);
    expect(track.start.x).toBeCloseTo(track.centerline[0].x, 6);
    expect(track.start.y).toBeCloseTo(track.centerline[0].y, 6);
    const heading = Math.atan2(
      track.centerline[1].y - track.centerline[0].y,
      track.centerline[1].x - track.centerline[0].x,
    );
    expect(track.start.heading).toBeCloseTo(heading, 6);
  });
});

describe('shape', () => {
  const twistinessValues = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const shapeSeeds = [11, 4242, 90210, 777, 31337];

  it('makes technical circuits narrower than fast ones', () => {
    expect(shapeFor(1).halfWidth).toBeLessThan(shapeFor(0).halfWidth);
    expect(shapeFor(1).minimumCornerRadius).toBeLessThan(shapeFor(0).minimumCornerRadius);
  });

  it.each(twistinessValues)('twistiness %s always yields a drivable circuit', (twistiness) => {
    for (const seed of shapeSeeds) {
      const track = generateTrack(seed, twistiness);
      const radius = minimumCornerRadius(track.centerline, track.spacing);
      const clearance = minimumSelfClearance(track.centerline, track.spacing, track.halfWidth * 2.2);

      expect(radius, `seed ${seed} corner radius folds the walls`).toBeGreaterThan(track.halfWidth);
      expect(clearance, `seed ${seed} circuit overlaps itself`).toBeGreaterThan(track.halfWidth * 2);
      expect(track.length).toBeGreaterThan(900);
    }
  });

  it('opens the corners up as a circuit gets less twisty', () => {
    const tight = generateTrack(2024, 1);
    const open = generateTrack(2024, 0);
    expect(minimumCornerRadius(open.centerline, open.spacing)).toBeGreaterThan(
      minimumCornerRadius(tight.centerline, tight.spacing),
    );
  });
});
