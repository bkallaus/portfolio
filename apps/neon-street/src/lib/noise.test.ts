import { createValueNoise, fbm } from './noise';

describe('value noise', () => {
  it('is deterministic, bounded and continuous', () => {
    const a = createValueNoise(42);
    const b = createValueNoise(42);
    for (let i = 0; i < 100; i++) {
      const x = i * 0.37;
      const y = i * 0.21;
      expect(a(x, y)).toBe(b(x, y));
      expect(fbm(a, x, y)).toBeGreaterThanOrEqual(0);
      expect(fbm(a, x, y)).toBeLessThanOrEqual(1);
      expect(Math.abs(a(x, y) - a(x + 0.001, y))).toBeLessThan(0.01);
    }
  });
});
