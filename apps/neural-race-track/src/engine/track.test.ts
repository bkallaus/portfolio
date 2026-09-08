import { describe, expect, it } from 'vitest';
import { createTrack, isOffTrack, progressAt } from './track';

describe('createTrack', () => {
  it('builds a closed loop with matching wall counts', () => {
    const track = createTrack(1234);
    expect(track.centerline.length).toBeGreaterThan(50);
    expect(track.leftWall).toHaveLength(track.centerline.length);
    expect(track.rightWall).toHaveLength(track.centerline.length);
    expect(track.totalLength).toBeGreaterThan(0);
  });

  it('is reproducible from its seed', () => {
    const a = createTrack(99);
    const b = createTrack(99);
    expect(a.centerline).toEqual(b.centerline);
  });

  it('reports the start sitting on the racing line', () => {
    const track = createTrack(42);
    const progress = progressAt(track, track.start.position);
    expect(progress.offset).toBeLessThan(1);
    expect(isOffTrack(track, track.start.position, 8)).toBe(false);
  });

  it('flags points well beyond the track width as off track', () => {
    const track = createTrack(7);
    const far = { x: track.bounds.max.x + 500, y: track.bounds.max.y + 500 };
    expect(isOffTrack(track, far, 8)).toBe(true);
  });
});
