import type { CarSpec } from './car';
import { createPresetCars } from './presets';
import { createRace, restartRun, runFinished, standings, stepRace, syncRacers } from './race';
import { generateTrack } from './track';

const track = generateTrack(8642);
const evolution = { enabled: true, rate: 0.2, amount: 0.35 };

const specs = (): CarSpec[] => createPresetCars().slice(0, 3);

describe('createRace', () => {
  it('puts one racer per spec on the grid', () => {
    const race = createRace(track, specs(), evolution);
    expect(race.racers).toHaveLength(3);
    for (const racer of race.racers) {
      expect(racer.state.alive).toBe(true);
      expect(racer.generation).toBe(1);
    }
  });

  it('staggers the grid so cars do not start stacked', () => {
    const race = createRace(track, specs(), evolution);
    const positions = race.racers.map((racer) => `${racer.state.x.toFixed(3)},${racer.state.y.toFixed(3)}`);
    expect(new Set(positions).size).toBe(3);
  });

  it('gives each car a brain sized for its own sensor count', () => {
    const race = createRace(track, createPresetCars(), evolution);
    for (const racer of race.racers) {
      expect(racer.brain.inputSize).toBe(racer.spec.sensors.count + 1);
      expect(racer.brain.outputSize).toBe(2);
    }
  });
});

describe('stepRace', () => {
  it('advances the clock and moves the cars', () => {
    const race = createRace(track, specs(), evolution);
    const start = race.racers.map((racer) => ({ x: racer.state.x, y: racer.state.y }));
    for (let tick = 0; tick < 30; tick++) stepRace(race, 1 / 60);
    expect(race.elapsed).toBeCloseTo(0.5);
    const moved = race.racers.filter(
      (racer, index) => racer.state.x !== start[index].x || racer.state.y !== start[index].y,
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it('starts a fresh run once every car has retired', () => {
    const race = createRace(track, specs(), evolution);
    for (const racer of race.racers) racer.state.alive = false;
    expect(runFinished(race)).toBe(true);
    stepRace(race, 1 / 60);
    expect(race.generation).toBeGreaterThan(1);
    expect(race.elapsed).toBe(0);
    for (const racer of race.racers) expect(racer.state.alive).toBe(true);
  });

  it('ends a run that outlasts the time limit', () => {
    const race = createRace(track, specs(), evolution);
    race.elapsed = race.runTimeLimit;
    expect(runFinished(race)).toBe(true);
  });
});

describe('restartRun', () => {
  it('remembers the best brain each car has driven', () => {
    const race = createRace(track, specs(), evolution);
    const racer = race.racers[0];
    racer.state.furthest = 500;
    const champion = racer.brain;
    restartRun(race, true);
    expect(racer.champion).toBe(champion);
    expect(racer.championDistance).toBe(500);
    expect(racer.generation).toBe(2);
  });

  it('keeps the old champion when the new attempt is worse', () => {
    const race = createRace(track, specs(), evolution);
    const racer = race.racers[0];
    racer.state.furthest = 500;
    restartRun(race, true);
    const champion = racer.champion;
    racer.state.furthest = 120;
    restartRun(race, true);
    expect(racer.champion).toBe(champion);
    expect(racer.championDistance).toBe(500);
  });

  it('mutates away from the champion when evolution is on', () => {
    const race = createRace(track, specs(), evolution);
    const racer = race.racers[1];
    racer.state.furthest = 300;
    restartRun(race, true);
    expect(racer.brain.layers[0].weights).not.toEqual(racer.champion.layers[0].weights);
    expect(racer.brain.layers[0].weights).toHaveLength(racer.champion.layers[0].weights.length);
  });

  it('replays the same brain when evolution is off', () => {
    const race = createRace(track, specs(), evolution);
    const racer = race.racers[1];
    restartRun(race, false);
    expect(racer.brain.layers[0].weights).toEqual(racer.champion.layers[0].weights);
    expect(racer.generation).toBe(1);
  });

  it('restarts a car that has never moved from a fresh brain', () => {
    const race = createRace(track, specs(), evolution);
    const racer = race.racers[0];
    racer.championDistance = 0;

    restartRun(race, true);
    const first = Float64Array.from(racer.brain.layers[0].weights);
    restartRun(race, true);
    const second = racer.brain.layers[0].weights;

    expect(first).not.toEqual(second);
    expect(second).toHaveLength(racer.champion.layers[0].weights.length);
    expect(racer.brain.inputSize).toBe(racer.spec.sensors.count + 1);
  });

  it('keeps refining by mutation once a car has covered ground', () => {
    const race = createRace(track, specs(), evolution);
    const racer = race.racers[0];
    racer.state.furthest = 400;
    restartRun(race, true);

    const champion = racer.champion.layers[0].weights;
    const mutated = racer.brain.layers[0].weights;
    const changed = Array.from(mutated).filter((value, index) => value !== champion[index]);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.length).toBeLessThan(mutated.length);
  });

  it('returns every car to the grid', () => {
    const race = createRace(track, specs(), evolution);
    for (let tick = 0; tick < 60; tick++) stepRace(race, 1 / 60);
    restartRun(race, true);
    for (const racer of race.racers) {
      expect(racer.state.speed).toBe(0);
      expect(racer.state.distance).toBe(0);
      expect(racer.state.alive).toBe(true);
    }
  });
});

describe('syncRacers', () => {
  const edited = (race: ReturnType<typeof createRace>, index: number, patch: Partial<CarSpec>) =>
    race.racers.map((racer, i) => (i === index ? { ...racer.spec, ...patch } : racer.spec));

  it('rebuilds the brain and clears what the old one had learned when the wiring changes', () => {
    const race = createRace(track, specs(), evolution);
    race.racers[0].championDistance = 900;
    syncRacers(race, edited(race, 0, { sensors: { count: 3, spreadDegrees: 90, range: 120 } }));
    expect(race.racers[0].brain.inputSize).toBe(4);
    expect(race.racers[0].championDistance).toBe(Number.NEGATIVE_INFINITY);
    expect(race.racers[0].generation).toBe(1);
  });

  it('keeps a car driving when only its name or colour changes', () => {
    const race = createRace(track, specs(), evolution);
    race.racers[0].championDistance = 900;
    const brain = race.racers[0].brain;
    syncRacers(race, edited(race, 0, { name: 'Renamed' }));
    expect(race.racers[0].spec.name).toBe('Renamed');
    expect(race.racers[0].brain).toBe(brain);
    expect(race.racers[0].championDistance).toBe(900);
  });

  it('leaves the other cars alone', () => {
    const race = createRace(track, specs(), evolution);
    const untouched = race.racers[1];
    syncRacers(race, edited(race, 0, { name: 'Renamed' }));
    expect(race.racers[1]).toBe(untouched);
  });

  it('adds and removes cars from the grid', () => {
    const race = createRace(track, specs(), evolution);
    const extra = { ...race.racers[0].spec, id: 'extra', name: 'Extra' };
    syncRacers(race, [...race.racers.map((racer) => racer.spec), extra]);
    expect(race.racers).toHaveLength(4);
    expect(race.racers[3].spec.id).toBe('extra');

    syncRacers(race, race.racers.slice(1).map((racer) => racer.spec));
    expect(race.racers).toHaveLength(3);
    expect(race.racers.map((racer) => racer.spec.id)).not.toContain(specs()[0].id);
  });
});

describe('standings', () => {
  it('ranks the cars by how far they have driven', () => {
    const race = createRace(track, specs(), evolution);
    race.racers[0].state.distance = 10;
    race.racers[1].state.distance = 300;
    race.racers[2].state.distance = 120;
    expect(standings(race).map((entry) => entry.distance)).toEqual([300, 120, 10]);
    expect(standings(race)[0].name).toBe(race.racers[1].spec.name);
  });

  it('reports the live distance before a car has ever finished a run', () => {
    const race = createRace(track, specs(), evolution);
    race.racers[0].state.distance = 42;
    expect(standings(race)[0].best).toBe(42);
  });
});

describe('learning over generations', () => {
  const totalDistance = (race: ReturnType<typeof createRace>) =>
    race.racers.reduce((total, racer) => total + racer.championDistance, 0);

  it('drives the grid further over successive generations', () => {
    const race = createRace(track, createPresetCars(), { enabled: true, rate: 0.18, amount: 0.32 }, 99);
    race.runTimeLimit = 14;

    while (race.generation < 2) stepRace(race, 1 / 60);
    const firstAttempt = race.racers.map((racer) => racer.championDistance);

    while (race.generation < 100) stepRace(race, 1 / 60);

    expect(totalDistance(race)).toBeGreaterThan(firstAttempt.reduce((total, value) => total + value, 0));
    expect(race.racers.filter((racer, index) => racer.championDistance > firstAttempt[index]).length).toBeGreaterThan(1);
  });

  it('never lets a car forget its best run', () => {
    const race = createRace(track, createPresetCars(), { enabled: true, rate: 0.18, amount: 0.32 }, 99);
    race.runTimeLimit = 14;
    const history: number[][] = [];
    let seen = race.generation;
    while (race.generation < 40) {
      stepRace(race, 1 / 60);
      if (race.generation === seen) continue;
      seen = race.generation;
      history.push(race.racers.map((racer) => racer.championDistance));
    }

    for (let generation = 1; generation < history.length; generation++) {
      history[generation].forEach((value, index) => {
        expect(value).toBeGreaterThanOrEqual(history[generation - 1][index]);
      });
    }
  });

  it('learns to complete a full lap of the circuit', () => {
    const race = createRace(track, createPresetCars(), { enabled: true, rate: 0.18, amount: 0.32 }, 99);
    race.runTimeLimit = 14;
    while (race.generation < 100) stepRace(race, 1 / 60);
    const furthest = Math.max(...race.racers.map((racer) => racer.championDistance));
    expect(furthest).toBeGreaterThan(track.length);
    expect(race.racers.some((racer) => racer.bestLapTime !== null)).toBe(true);
  });

  it('never changes a brain while evolution is switched off', () => {
    const race = createRace(track, createPresetCars(), { enabled: false, rate: 0.18, amount: 0.32 }, 99);
    race.runTimeLimit = 6;
    const brains = race.racers.map((racer) => racer.brain);
    for (let tick = 0; tick < 3000; tick++) stepRace(race, 1 / 60);
    expect(race.generation).toBe(1);
    race.racers.forEach((racer, index) => {
      expect(racer.brain.layers[0].weights).toEqual(brains[index].layers[0].weights);
      expect(racer.generation).toBe(1);
    });
  });
});
