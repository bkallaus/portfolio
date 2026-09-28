import { petalScaleX, spawnPetal, stepPetal, wrapPetal } from './petals';
import { createRng } from './rng';

const field = { width: 1000, height: 800 };
const calm = { time: 0, wind: 0, cameraShift: 0 };

describe('petals', () => {
  it('spawns deterministically for a seed', () => {
    expect(spawnPetal(createRng(7), field, 0.4, 1, false)).toEqual(spawnPetal(createRng(7), field, 0.4, 1, false));
  });

  it('spawns above the field when asked to enter from the top', () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) expect(spawnPetal(rng, field, 0.4, 1, true).y).toBeLessThan(0);
  });

  it('falls, and nearer petals fall faster', () => {
    const rng = createRng(11);
    const near = { ...spawnPetal(rng, field, 1, 1, false), y: 100 };
    const far = { ...near, depth: 0.3 };
    stepPetal(near, 1, calm);
    stepPetal(far, 1, calm);
    expect(near.y).toBeGreaterThan(100);
    expect(near.y - 100).toBeGreaterThan(far.y - 100);
  });

  it('drifts with the wind', () => {
    const petal = { ...spawnPetal(createRng(5), field, 1, 1, false), phase: 0, x: 500 };
    stepPetal(petal, 0.5, { ...calm, wind: 1 });
    expect(petal.x).toBeGreaterThan(500);
  });

  it('moves up the screen when the camera cranes down, by its depth', () => {
    const petal = { ...spawnPetal(createRng(5), field, 0.5, 0.5, false), y: 400, fall: 0 };
    stepPetal(petal, 0, { ...calm, cameraShift: 100 });
    expect(petal.y).toBe(350);
  });

  it('recycles petals that leave the bottom back to the top', () => {
    const petal = { ...spawnPetal(createRng(1), field, 1, 1, false), y: 2000 };
    expect(wrapPetal(petal, field)).toBe(true);
    expect(petal.y).toBeLessThan(0);
  });

  it('wraps horizontally without recycling', () => {
    const petal = { ...spawnPetal(createRng(1), field, 1, 1, false), x: -500, y: 400 };
    expect(wrapPetal(petal, field)).toBe(false);
    expect(petal.x).toBeGreaterThan(0);
  });

  it('never collapses a tumbling petal to zero width', () => {
    const petal = { ...spawnPetal(createRng(1), field, 1, 1, false), flip: Math.PI / 2 };
    expect(petalScaleX(petal)).toBeGreaterThan(0);
  });
});
