import { PETAL_VOLUME, petalScaleX, recyclePetal, spawnPetal, stepPetal } from './petals';
import { createRng } from './rng';

const anchor = { x: 0, y: 10, z: 50 };
const calm = { time: 0, wind: 0 };

describe('petals', () => {
  it('spawns deterministically inside the volume in front of the camera', () => {
    expect(spawnPetal(createRng(7), anchor, PETAL_VOLUME, false)).toEqual(spawnPetal(createRng(7), anchor, PETAL_VOLUME, false));
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const petal = spawnPetal(rng, anchor, PETAL_VOLUME, false);
      expect(petal.z).toBeGreaterThan(anchor.z + PETAL_VOLUME.near - 1e-9);
      expect(petal.z).toBeLessThanOrEqual(anchor.z + PETAL_VOLUME.far);
      expect(Math.abs(petal.x - anchor.x)).toBeLessThanOrEqual(PETAL_VOLUME.halfWidth);
      expect(petal.y).toBeGreaterThan(0);
    }
  });

  it('falls under gravity and drifts with the wind', () => {
    const petal = { ...spawnPetal(createRng(11), anchor, PETAL_VOLUME, false), y: 10, x: 0, phase: 0 };
    stepPetal(petal, 1, { ...calm, wind: 1 });
    expect(petal.y).toBeLessThan(10);
    expect(petal.x).toBeGreaterThan(0);
  });

  it('respawns petals the camera has flown past, far ahead', () => {
    const rng = createRng(1);
    const petal = { ...spawnPetal(rng, anchor, PETAL_VOLUME, false), z: anchor.z - 1 };
    expect(recyclePetal(petal, rng, anchor, PETAL_VOLUME)).toBe(true);
    expect(petal.z).toBeGreaterThan(anchor.z + PETAL_VOLUME.far * 0.5);
  });

  it('respawns petals that reach the ground above the camera', () => {
    const rng = createRng(2);
    const petal = { ...spawnPetal(rng, anchor, PETAL_VOLUME, false), y: 0 };
    expect(recyclePetal(petal, rng, anchor, PETAL_VOLUME)).toBe(true);
    expect(petal.y).toBeGreaterThan(anchor.y);
  });

  it('wraps sideways without respawning', () => {
    const rng = createRng(4);
    const petal = { ...spawnPetal(rng, anchor, PETAL_VOLUME, false), x: -12, y: 10, z: 60 };
    expect(recyclePetal(petal, rng, anchor, PETAL_VOLUME)).toBe(false);
    expect(petal.x).toBe(-12 + PETAL_VOLUME.halfWidth * 2);
  });

  it('never collapses a tumbling petal to zero width', () => {
    const petal = { ...spawnPetal(createRng(1), anchor, PETAL_VOLUME, false), flip: Math.PI / 2 };
    expect(petalScaleX(petal)).toBeGreaterThan(0);
  });
});
