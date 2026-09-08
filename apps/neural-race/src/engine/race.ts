import {
  BRAIN_OUTPUT_SIZE,
  type CarSpec,
  type CarState,
  brainInputSize,
  createCarState,
  stepCar,
} from './car';
import { type Network, createNetwork, mutateNetwork } from './network';
import { type Rng, createRng } from './rng';
import type { Track } from './track';

export type Racer = {
  spec: CarSpec;
  brain: Network;
  champion: Network;
  championDistance: number;
  state: CarState;
  generation: number;
  bestLapTime: number | null;
  lapStartedAt: number;
};

export type EvolutionSettings = {
  enabled: boolean;
  rate: number;
  amount: number;
};

export type Race = {
  track: Track;
  racers: Racer[];
  elapsed: number;
  generation: number;
  runTimeLimit: number;
  evolution: EvolutionSettings;
  rng: Rng;
};

const GRID_ROW_GAP = 30;

function buildBrain(spec: CarSpec): Network {
  return createNetwork(spec.brain, brainInputSize(spec.sensors), BRAIN_OUTPUT_SIZE);
}

function gridState(track: Track, index: number, total: number): CarState {
  const usable = (track.halfWidth - 14) * 1.4;
  const lane = total <= 1 ? 0 : -usable / 2 + (usable * index) / (total - 1);
  return createCarState(track, lane, GRID_ROW_GAP * (index % 2));
}

export function createRacer(spec: CarSpec, track: Track, index: number, total: number): Racer {
  const brain = buildBrain(spec);
  return {
    spec,
    brain,
    champion: brain,
    championDistance: Number.NEGATIVE_INFINITY,
    state: gridState(track, index, total),
    generation: 1,
    bestLapTime: null,
    lapStartedAt: 0,
  };
}

export function createRace(
  track: Track,
  specs: CarSpec[],
  evolution: EvolutionSettings,
  seed = 7,
): Race {
  return {
    track,
    racers: specs.map((spec, index) => createRacer(spec, track, index, specs.length)),
    elapsed: 0,
    generation: 1,
    runTimeLimit: 45,
    evolution,
    rng: createRng(seed),
  };
}

function nextBrain(race: Race, racer: Racer): Network {
  if (racer.championDistance > 0) {
    return mutateNetwork(racer.champion, race.rng, race.evolution.rate, race.evolution.amount);
  }
  const seed = Math.floor(race.rng() * 0xffffffff) >>> 0;
  return buildBrain({ ...racer.spec, brain: { ...racer.spec.brain, seed } });
}

export function restartRun(race: Race, mutate: boolean): void {
  race.racers.forEach((racer, index) => {
    if (racer.state.furthest > racer.championDistance) {
      racer.champion = racer.brain;
      racer.championDistance = racer.state.furthest;
    }
    racer.brain = mutate ? nextBrain(race, racer) : racer.champion;
    racer.state = gridState(race.track, index, race.racers.length);
    racer.lapStartedAt = 0;
    if (mutate) racer.generation += 1;
  });
  race.elapsed = 0;
  if (mutate) race.generation += 1;
}

export function brainSignature(spec: CarSpec): string {
  return [
    spec.sensors.count,
    spec.sensors.spreadDegrees,
    spec.sensors.range,
    spec.brain.hiddenLayers.join('-'),
    spec.brain.activation,
    spec.brain.seed,
    spec.brain.weightScale,
  ].join('|');
}

export function syncRacers(race: Race, specs: CarSpec[]): void {
  const existing = new Map(race.racers.map((racer) => [racer.spec.id, racer]));
  race.racers = specs.map((spec, index) => {
    const current = existing.get(spec.id);
    if (!current) return createRacer(spec, race.track, index, specs.length);
    if (brainSignature(current.spec) === brainSignature(spec)) {
      return current.spec === spec ? current : { ...current, spec };
    }
    const brain = buildBrain(spec);
    return {
      ...current,
      spec,
      brain,
      champion: brain,
      championDistance: Number.NEGATIVE_INFINITY,
      generation: 1,
      bestLapTime: null,
      state: gridState(race.track, index, specs.length),
    };
  });
}

export function runFinished(race: Race): boolean {
  return race.elapsed >= race.runTimeLimit || race.racers.every((racer) => !racer.state.alive);
}

export function stepRace(race: Race, dt: number): void {
  for (const racer of race.racers) {
    if (!racer.state.alive) continue;
    const lapsBefore = racer.state.laps;
    stepCar(racer.spec, racer.state, racer.brain, race.track, dt);
    if (racer.state.laps > lapsBefore) {
      const lapTime = race.elapsed - racer.lapStartedAt;
      racer.bestLapTime = racer.bestLapTime === null ? lapTime : Math.min(racer.bestLapTime, lapTime);
      racer.lapStartedAt = race.elapsed;
    }
  }
  race.elapsed += dt;

  if (runFinished(race)) restartRun(race, race.evolution.enabled);
}

export type Standing = {
  id: string;
  name: string;
  color: string;
  distance: number;
  best: number;
  laps: number;
  speed: number;
  alive: boolean;
  retirement: CarState['retirement'];
  generation: number;
  bestLapTime: number | null;
};

export function standings(race: Race): Standing[] {
  return race.racers
    .map((racer) => ({
      id: racer.spec.id,
      name: racer.spec.name,
      color: racer.spec.color,
      distance: racer.state.distance,
      best: racer.championDistance === Number.NEGATIVE_INFINITY ? racer.state.distance : racer.championDistance,
      laps: racer.state.laps,
      speed: racer.state.speed,
      alive: racer.state.alive,
      retirement: racer.state.retirement,
      generation: racer.generation,
      bestLapTime: racer.bestLapTime,
    }))
    .sort((a, b) => b.distance - a.distance);
}
