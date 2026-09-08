import { NeuralNetwork, type NetworkShape } from './neuralNetwork';
import { createRng, type Rng } from './rng';
import { castSensors, sensorAngles, type SensorReading } from './sensors';
import { progressAt, type Track } from './track';
import type { CarConfig, CarStats } from '../types';
import { fromAngle, type Vec } from './vec';

export const SENSOR_RANGE = 230;
const CAR_RADIUS = 8;
const TURN_RATE = 3.1;
const ACCELERATION = 190;
const DRAG = 0.9;
const IDLE_LIMIT = 3.2;
const MUTATION_RATE = 0.2;
const MUTATION_AMOUNT = 0.35;

const shapeFor = (config: CarConfig): NetworkShape => ({
  inputs: config.sensorCount + 1,
  hidden: config.hidden,
  outputs: 2,
});

export class Car {
  config: CarConfig;
  brain: NeuralNetwork;
  position: Vec;
  heading: number;
  speed = 0;
  alive = true;
  laps = 0;
  generation = 0;
  sensors: SensorReading[] = [];

  private readonly rng: Rng;
  private bestBrain: NeuralNetwork | null = null;
  private bestFitness = 0;
  private arc = 0;
  private trackDistance = 0;
  private maxTrackDistance = 0;
  private idleTime = 0;
  private angles: number[];

  constructor(config: CarConfig, track: Track) {
    this.config = config;
    this.rng = createRng(config.seed ^ 0x9e3779b9);
    this.brain = NeuralNetwork.random(shapeFor(config), config.activation, createRng(config.seed));
    this.angles = sensorAngles(config.sensorCount, config.sensorSpread);
    this.position = track.start.position;
    this.heading = track.start.heading;
    this.placeAtStart(track);
  }

  private placeAtStart(track: Track) {
    this.position = { ...track.start.position };
    this.heading = track.start.heading;
    this.speed = 0;
    this.alive = true;
    this.laps = 0;
    this.idleTime = 0;
    this.arc = progressAt(track, this.position).distance;
    this.trackDistance = 0;
    this.maxTrackDistance = 0;
    this.sensors = castSensors(this.position, this.heading, this.angles, track, SENSOR_RANGE);
  }

  applyConfig(config: CarConfig, track: Track) {
    const shapeChanged =
      config.sensorCount !== this.config.sensorCount ||
      config.activation !== this.config.activation ||
      config.hidden.length !== this.config.hidden.length ||
      config.hidden.some((size, index) => size !== this.config.hidden[index]);
    this.config = config;
    this.angles = sensorAngles(config.sensorCount, config.sensorSpread);
    if (shapeChanged) this.randomizeBrain();
    this.placeAtStart(track);
  }

  randomizeBrain() {
    this.brain = NeuralNetwork.random(shapeFor(this.config), this.config.activation, this.rng);
    this.bestBrain = null;
    this.bestFitness = 0;
    this.generation = 0;
  }

  respawn(track: Track, evolve: boolean) {
    if (evolve) {
      const parent = this.bestBrain ?? this.brain;
      this.brain =
        this.rng.next() < 0.12
          ? NeuralNetwork.random(shapeFor(this.config), this.config.activation, this.rng)
          : parent.mutated(MUTATION_RATE, MUTATION_AMOUNT, this.rng);
      this.generation += 1;
    }
    this.placeAtStart(track);
  }

  step(dt: number, track: Track) {
    if (!this.alive) return;
    this.sensors = castSensors(this.position, this.heading, this.angles, track, SENSOR_RANGE);
    const inputs = this.sensors.map((reading) => 1 - reading.distance / SENSOR_RANGE);
    inputs.push(this.speed / this.config.maxSpeed);
    const [steer, throttle] = this.brain.forward(inputs);
    this.heading += steer * TURN_RATE * dt;
    const drive = throttle * 0.5 + 0.5;
    this.speed += drive * ACCELERATION * dt;
    this.speed *= 1 - DRAG * dt;
    this.speed = Math.max(0, Math.min(this.config.maxSpeed, this.speed));
    const direction = fromAngle(this.heading);
    this.position = {
      x: this.position.x + direction.x * this.speed * dt,
      y: this.position.y + direction.y * this.speed * dt,
    };
    this.updateProgress(track, dt);
  }

  private updateProgress(track: Track, dt: number) {
    const progress = progressAt(track, this.position);
    let delta = progress.distance - this.arc;
    if (delta < -track.totalLength / 2) {
      delta += track.totalLength;
      this.laps += 1;
    } else if (delta > track.totalLength / 2) {
      delta -= track.totalLength;
      this.laps -= 1;
    }
    this.arc = progress.distance;
    this.trackDistance += delta;
    if (this.trackDistance > this.maxTrackDistance + 1) {
      this.maxTrackDistance = this.trackDistance;
      this.idleTime = 0;
    } else {
      this.idleTime += dt;
    }
    const crashed = progress.offset > track.width / 2 - CAR_RADIUS;
    if (crashed || this.idleTime > IDLE_LIMIT) this.kill();
  }

  private kill() {
    this.alive = false;
    if (this.maxTrackDistance > this.bestFitness) {
      this.bestFitness = this.maxTrackDistance;
      this.bestBrain = this.brain.clone();
    }
  }

  stats(): CarStats {
    return {
      id: this.config.id,
      name: this.config.name,
      color: this.config.color,
      alive: this.alive,
      speed: this.speed,
      laps: this.laps,
      bestDistance: Math.max(this.bestFitness, this.maxTrackDistance),
      currentDistance: this.maxTrackDistance,
      generation: this.generation,
      parameters: this.brain.parameterCount(),
      sensorCount: this.config.sensorCount,
      hidden: this.config.hidden,
      activation: this.config.activation,
    };
  }
}
