import { randomSeed } from './engine/rng';
import type { CarConfig } from './types';

const PALETTE = [
  '#4dd0e1',
  '#ff8a65',
  '#ba9cff',
  '#ffd54f',
  '#81c784',
  '#f06292',
  '#4fc3f7',
  '#aed581',
];

const NAMES = ['Scout', 'Blitz', 'Minimal', 'Apex', 'Drift', 'Vector', 'Nova', 'Torque'];

const degrees = (value: number) => (value * Math.PI) / 180;

let counter = 0;
const nextId = () => {
  counter += 1;
  return `car-${counter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
};

export const spawnConfig = (index: number): CarConfig => ({
  id: nextId(),
  name: NAMES[index % NAMES.length],
  color: PALETTE[index % PALETTE.length],
  sensorCount: 5,
  sensorSpread: degrees(150),
  hidden: [6],
  activation: 'tanh',
  maxSpeed: 160,
  seed: randomSeed(),
});

export const createDefaultConfigs = (): CarConfig[] => [
  {
    id: nextId(),
    name: 'Scout',
    color: PALETTE[0],
    sensorCount: 5,
    sensorSpread: degrees(150),
    hidden: [6],
    activation: 'tanh',
    maxSpeed: 150,
    seed: randomSeed(),
  },
  {
    id: nextId(),
    name: 'Blitz',
    color: PALETTE[1],
    sensorCount: 7,
    sensorSpread: degrees(180),
    hidden: [10, 6],
    activation: 'relu',
    maxSpeed: 200,
    seed: randomSeed(),
  },
  {
    id: nextId(),
    name: 'Minimal',
    color: PALETTE[2],
    sensorCount: 3,
    sensorSpread: degrees(110),
    hidden: [],
    activation: 'tanh',
    maxSpeed: 140,
    seed: randomSeed(),
  },
];
