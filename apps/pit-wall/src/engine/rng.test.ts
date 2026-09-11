import { between, createRng, gaussian } from './rng';

describe('createRng', () => {
  it('produces the same stream for the same seed', () => {
    const first = createRng(42);
    const second = createRng(42);
    const draws = Array.from({ length: 10 }, () => first());
    expect(draws).toEqual(Array.from({ length: 10 }, () => second()));
  });

  it('produces different streams for different seeds', () => {
    const first = Array.from({ length: 5 }, createRng(1));
    const second = Array.from({ length: 5 }, createRng(2));
    expect(first).not.toEqual(second);
  });

  it('stays inside the unit interval', () => {
    const rng = createRng(7);
    for (let i = 0; i < 2000; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('between', () => {
  it('stays inside the requested range', () => {
    const rng = createRng(9);
    for (let i = 0; i < 500; i++) {
      const value = between(rng, -3, 11);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThan(11);
    }
  });
});

describe('gaussian', () => {
  it('centres near zero with roughly unit spread', () => {
    const rng = createRng(11);
    const samples = Array.from({ length: 4000 }, () => gaussian(rng));
    const mean = samples.reduce((total, value) => total + value, 0) / samples.length;
    const variance = samples.reduce((total, value) => total + (value - mean) ** 2, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
    expect(variance).toBeGreaterThan(0.8);
    expect(variance).toBeLessThan(1.2);
  });
});
