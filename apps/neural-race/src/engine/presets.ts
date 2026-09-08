import type { CarSpec } from './car';

const defaultChassis = {
  maxSpeed: 210,
  acceleration: 190,
  braking: 260,
  turnRateDegrees: 165,
};

export const CAR_COLORS = ['#f5a524', '#4cc9f0', '#f72585', '#8ac926', '#b07cff', '#ff6b3d'];

export function createPresetCars(): CarSpec[] {
  return [
    {
      id: 'reflex',
      name: 'Reflex',
      color: CAR_COLORS[0],
      sensors: { count: 5, spreadDegrees: 150, range: 190 },
      chassis: { ...defaultChassis },
      brain: { hiddenLayers: [], activation: 'tanh', seed: 1337, weightScale: 1.4 },
    },
    {
      id: 'weaver',
      name: 'Weaver',
      color: CAR_COLORS[1],
      sensors: { count: 7, spreadDegrees: 170, range: 210 },
      chassis: { ...defaultChassis },
      brain: { hiddenLayers: [6], activation: 'tanh', seed: 2024, weightScale: 1.2 },
    },
    {
      id: 'deep-stack',
      name: 'Deep Stack',
      color: CAR_COLORS[2],
      sensors: { count: 7, spreadDegrees: 160, range: 230 },
      chassis: { ...defaultChassis },
      brain: { hiddenLayers: [10, 6], activation: 'relu', seed: 90210, weightScale: 1.1 },
    },
    {
      id: 'wide-eye',
      name: 'Wide Eye',
      color: CAR_COLORS[3],
      sensors: { count: 9, spreadDegrees: 210, range: 170 },
      chassis: { ...defaultChassis },
      brain: { hiddenLayers: [8], activation: 'sigmoid', seed: 4242, weightScale: 1.6 },
    },
  ];
}

export function createCarSpec(index: number, seed: number): CarSpec {
  return {
    id: `car-${seed.toString(36)}`,
    name: `Car ${index + 1}`,
    color: CAR_COLORS[index % CAR_COLORS.length],
    sensors: { count: 7, spreadDegrees: 170, range: 200 },
    chassis: { ...defaultChassis },
    brain: { hiddenLayers: [6], activation: 'tanh', seed, weightScale: 1.3 },
  };
}
