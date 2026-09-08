import type { Activation } from './engine/neuralNetwork';

export type CarConfig = {
  id: string;
  name: string;
  color: string;
  sensorCount: number;
  sensorSpread: number;
  hidden: number[];
  activation: Activation;
  maxSpeed: number;
  seed: number;
};

export type CarStats = {
  id: string;
  name: string;
  color: string;
  alive: boolean;
  speed: number;
  laps: number;
  bestDistance: number;
  currentDistance: number;
  generation: number;
  parameters: number;
  sensorCount: number;
  hidden: number[];
  activation: Activation;
};
