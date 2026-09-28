import { altitudeAt, CRANE_TRAVEL, layerOffset, layerSize, scrollProgress, swayMargin } from './parallax';

const viewport = { width: 1200, height: 800 };
const still = { x: 0, y: 0 };

describe('scrollProgress', () => {
  it('runs from 0 at the top to 1 at the bottom of the scrollable range', () => {
    expect(scrollProgress(0, 4000, 800)).toBe(0);
    expect(scrollProgress(1600, 4000, 800)).toBe(0.5);
    expect(scrollProgress(3200, 4000, 800)).toBe(1);
  });

  it('clamps overscroll and handles pages that cannot scroll', () => {
    expect(scrollProgress(-50, 4000, 800)).toBe(0);
    expect(scrollProgress(9000, 4000, 800)).toBe(1);
    expect(scrollProgress(0, 800, 800)).toBe(0);
  });
});

describe('layers', () => {
  it('makes deeper-in-front layers taller so they have room to travel', () => {
    const far = layerSize(viewport, 0.1);
    const near = layerSize(viewport, 1);
    expect(near.height).toBeGreaterThan(far.height);
    expect(near.height).toBe(Math.ceil(800 * (1 + CRANE_TRAVEL)) + swayMargin(viewport) * 2);
  });

  it('moves near layers further than far layers for the same scroll', () => {
    const farTravel = layerOffset(1, 0.1, viewport, still).y - layerOffset(0, 0.1, viewport, still).y;
    const nearTravel = layerOffset(1, 1, viewport, still).y - layerOffset(0, 1, viewport, still).y;
    expect(Math.abs(nearTravel)).toBeCloseTo(Math.abs(farTravel) * 10);
  });

  it('never reveals the edge of a layer, even at full scroll and full pointer sway', () => {
    for (const depth of [0.04, 0.5, 1]) {
      const size = layerSize(viewport, depth);
      for (const pointer of [
        { x: -1, y: -1 },
        { x: 1, y: 1 },
      ]) {
        for (const progress of [0, 1]) {
          const offset = layerOffset(progress, depth, viewport, pointer);
          expect(offset.x).toBeLessThanOrEqual(0);
          expect(offset.y).toBeLessThanOrEqual(0);
          expect(offset.x + size.width).toBeGreaterThanOrEqual(viewport.width);
          expect(offset.y + size.height).toBeGreaterThanOrEqual(viewport.height);
        }
      }
    }
  });
});

describe('altitudeAt', () => {
  it('descends from the rooftops to eye level', () => {
    expect(altitudeAt(0)).toBe(212);
    expect(altitudeAt(1)).toBeCloseTo(1.6);
    expect(altitudeAt(0.5)).toBeGreaterThan(altitudeAt(0.6));
  });
});
