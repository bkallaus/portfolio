import type { Capability } from './racingLine';

export type Stats = {
  power: number;
  brakes: number;
  grip: number;
  topEnd: number;
};

export type CarSetup = {
  id: string;
  name: string;
  color: string;
  stats: Stats;
};

export const STAT_KEYS: (keyof Stats)[] = ['power', 'brakes', 'grip', 'topEnd'];
export const STAT_MINIMUM = 10;
export const STAT_MAXIMUM = 100;
export const STAT_BUDGET = 240;

export const STAT_LABELS: Record<keyof Stats, string> = {
  power: 'Power',
  brakes: 'Brakes',
  grip: 'Grip',
  topEnd: 'Top end',
};

export const STAT_BLURBS: Record<keyof Stats, string> = {
  power: 'How hard it accelerates out of a corner',
  brakes: 'How late it can brake into one',
  grip: 'How fast it can hold a corner',
  topEnd: 'How fast it runs down a straight',
};

export function spentOn(stats: Stats): number {
  return STAT_KEYS.reduce((total, key) => total + stats[key], 0);
}

export function remainingBudget(stats: Stats): number {
  return STAT_BUDGET - spentOn(stats);
}

function sharpened(stat: number): number {
  const scaled = Math.min(STAT_MAXIMUM, Math.max(0, stat)) / STAT_MAXIMUM;
  return scaled ** 1.4;
}

export function capabilityOf(stats: Stats): Capability {
  return {
    topSpeed: 250 + stats.topEnd * 1.5,
    acceleration: 95 + sharpened(stats.power) * 300,
    braking: 150 + sharpened(stats.brakes) * 420,
    lateralGrip: 225 + sharpened(stats.grip) * 840,
  };
}
