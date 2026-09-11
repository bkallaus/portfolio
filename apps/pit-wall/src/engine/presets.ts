import type { CarSetup, Stats } from './setup';

export const CAR_COLORS = ['#f5a524', '#4cc9f0', '#f72585', '#8ac926', '#b07cff', '#ff6b3d'];

export const PLAYER_ID = 'player';

export const STARTING_STATS: Stats = { power: 60, brakes: 60, grip: 60, topEnd: 60 };

export function createPlayer(): CarSetup {
  return {
    id: PLAYER_ID,
    name: 'Your car',
    color: CAR_COLORS[0],
    stats: { ...STARTING_STATS },
  };
}

export function createRivals(): CarSetup[] {
  return [
    {
      id: 'rival-rocket',
      name: 'Bolt',
      color: CAR_COLORS[1],
      stats: { power: 45, brakes: 40, grip: 55, topEnd: 100 },
    },
    {
      id: 'rival-gripper',
      name: 'Hairpin',
      color: CAR_COLORS[2],
      stats: { power: 50, brakes: 60, grip: 100, topEnd: 30 },
    },
    {
      id: 'rival-puncher',
      name: 'Uppercut',
      color: CAR_COLORS[3],
      stats: { power: 100, brakes: 55, grip: 55, topEnd: 30 },
    },
  ];
}
