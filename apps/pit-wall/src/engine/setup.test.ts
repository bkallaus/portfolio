import {
  STAT_BUDGET,
  STAT_KEYS,
  type Stats,
  capabilityOf,
  remainingBudget,
  spentOn,
} from './setup';
import { createPlayer, createRivals } from './presets';

const evenly: Stats = { power: 60, brakes: 60, grip: 60, topEnd: 60 };

describe('budget', () => {
  it('counts every stat', () => {
    expect(spentOn(evenly)).toBe(240);
    expect(remainingBudget(evenly)).toBe(STAT_BUDGET - 240);
  });

  it('starts the player on exactly the budget', () => {
    expect(spentOn(createPlayer().stats)).toBe(STAT_BUDGET);
  });

  it('gives every rival the same budget as the player', () => {
    for (const rival of createRivals()) {
      expect(spentOn(rival.stats)).toBe(STAT_BUDGET);
    }
  });

  it('gives rivals distinct identities and colours', () => {
    const rivals = createRivals();
    expect(new Set(rivals.map((rival) => rival.id)).size).toBe(rivals.length);
    expect(new Set(rivals.map((rival) => rival.color)).size).toBe(rivals.length);
  });
});

describe('capabilityOf', () => {
  it('turns every stat into a positive capability', () => {
    const capability = capabilityOf(evenly);
    expect(capability.topSpeed).toBeGreaterThan(0);
    expect(capability.acceleration).toBeGreaterThan(0);
    expect(capability.braking).toBeGreaterThan(0);
    expect(capability.lateralGrip).toBeGreaterThan(0);
  });

  it('rises with every stat and never falls', () => {
    for (const key of STAT_KEYS) {
      const low = capabilityOf({ ...evenly, [key]: 10 });
      const high = capabilityOf({ ...evenly, [key]: 100 });
      const changed = (Object.keys(low) as (keyof typeof low)[]).filter((field) => high[field] > low[field]);
      expect(changed).toHaveLength(1);
    }
  });

  it('rewards specialising more than the linear share', () => {
    const half = capabilityOf({ ...evenly, grip: 50 }).lateralGrip;
    const full = capabilityOf({ ...evenly, grip: 100 }).lateralGrip;
    const none = capabilityOf({ ...evenly, grip: 0 }).lateralGrip;
    expect(full - half).toBeGreaterThan(half - none);
  });
});
