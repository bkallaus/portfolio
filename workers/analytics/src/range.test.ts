import { describe, expect, it } from 'vitest';
import { sinceDay } from './range.ts';

const now = new Date('2026-10-10T15:00:00Z');

describe('sinceDay', () => {
  it('counts today as the first day of the window', () => {
    expect(sinceDay('1', now)).toBe('2026-10-10');
    expect(sinceDay('7', now)).toBe('2026-10-04');
  });

  it('defaults to thirty days and clamps to a year', () => {
    expect(sinceDay(null, now)).toBe('2026-09-11');
    expect(sinceDay('junk', now)).toBe('2026-09-11');
    expect(sinceDay('10000', now)).toBe('2025-10-11');
    expect(sinceDay('-4', now)).toBe('2026-10-10');
  });
});
