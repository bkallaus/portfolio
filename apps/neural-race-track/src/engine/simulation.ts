import { Car } from './car';
import { createTrack, type Track } from './track';
import type { CarConfig } from '../types';

const FIXED_STEP = 1 / 60;
const RESPAWN_DELAY = 0.6;

export class Simulation {
  track: Track;
  cars: Car[] = [];
  evolve = true;
  private respawnTimers = new Map<string, number>();

  constructor(seed: number, configs: CarConfig[]) {
    this.track = createTrack(seed);
    this.cars = configs.map((config) => new Car(config, this.track));
  }

  setTrack(seed: number) {
    this.track = createTrack(seed);
    this.respawnTimers.clear();
    for (const car of this.cars) car.respawn(this.track, false);
  }

  syncConfigs(configs: CarConfig[]) {
    const byId = new Map(this.cars.map((car) => [car.config.id, car]));
    this.cars = configs.map((config) => {
      const existing = byId.get(config.id);
      if (existing) {
        existing.applyConfig(config, this.track);
        return existing;
      }
      return new Car(config, this.track);
    });
    this.respawnTimers.clear();
  }

  resetAll() {
    this.respawnTimers.clear();
    for (const car of this.cars) car.respawn(this.track, false);
  }

  randomizeBrains() {
    this.respawnTimers.clear();
    for (const car of this.cars) {
      car.randomizeBrain();
      car.respawn(this.track, false);
    }
  }

  advance(elapsedSeconds: number, speedMultiplier: number) {
    let remaining = elapsedSeconds * speedMultiplier;
    const maxSteps = Math.ceil((1 / 20) * speedMultiplier * 60);
    let steps = 0;
    while (remaining > 0 && steps < maxSteps) {
      this.tick(FIXED_STEP);
      remaining -= FIXED_STEP;
      steps += 1;
    }
  }

  private tick(dt: number) {
    for (const car of this.cars) {
      if (car.alive) {
        car.step(dt, this.track);
        continue;
      }
      const timer = (this.respawnTimers.get(car.config.id) ?? 0) + dt;
      if (this.evolve && timer >= RESPAWN_DELAY) {
        car.respawn(this.track, true);
        this.respawnTimers.delete(car.config.id);
      } else {
        this.respawnTimers.set(car.config.id, timer);
      }
    }
  }
}
