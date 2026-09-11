import { createPlayer, createRivals } from './presets';
import { createRace, orderOf, standings, startRace, stepRace } from './race';
import { blockerFor } from './runner';
import { generateTrack } from './track';

const track = generateTrack(5150);
const grid = () => [createPlayer(), ...createRivals()];

const runToFinish = (laps = 2) => {
  const race = createRace(track, grid(), laps);
  startRace(race);
  let guard = 0;
  while (race.status === 'running' && guard++ < 200000) stepRace(race, 1 / 60);
  return race;
};

describe('createRace', () => {
  it('puts every car on the grid behind the start line', () => {
    const race = createRace(track, grid());
    expect(race.runners).toHaveLength(4);
    for (const runner of race.runners) {
      expect(runner.lap).toBe(0);
      expect(runner.speed).toBe(0);
      expect(runner.finished).toBe(false);
    }
  });

  it('spaces the grid so no two cars share a slot', () => {
    const race = createRace(track, grid());
    const slots = race.runners.map((runner) => `${runner.arc.toFixed(2)}:${runner.offset.toFixed(2)}`);
    expect(new Set(slots).size).toBe(race.runners.length);
  });

  it('gives each car its own pace from its own stats', () => {
    const race = createRace(track, grid());
    const lapTimes = race.runners.map((runner) => runner.pace.lapTime);
    expect(new Set(lapTimes.map((time) => time.toFixed(4))).size).toBeGreaterThan(1);
  });

  it('does not move anyone until the race starts', () => {
    const race = createRace(track, grid());
    const before = race.runners.map((runner) => runner.arc);
    for (let tick = 0; tick < 60; tick++) stepRace(race, 1 / 60);
    expect(race.runners.map((runner) => runner.arc)).toEqual(before);
    expect(race.elapsed).toBe(0);
  });
});

describe('stepRace', () => {
  it('gets every car moving once started', () => {
    const race = createRace(track, grid());
    startRace(race);
    for (let tick = 0; tick < 120; tick++) stepRace(race, 1 / 60);
    for (const runner of race.runners) {
      expect(runner.speed).toBeGreaterThan(0);
      expect(race.elapsed).toBeCloseTo(2, 1);
    }
  });

  it('keeps every car on the track surface', () => {
    const race = createRace(track, grid());
    startRace(race);
    for (let tick = 0; tick < 3000; tick++) {
      stepRace(race, 1 / 60);
      for (const runner of race.runners) {
        expect(Math.abs(runner.offset)).toBeLessThanOrEqual(track.halfWidth);
      }
    }
  });

  it('finishes the race and records a finishing time for everyone', () => {
    const race = runToFinish();
    expect(race.status).toBe('finished');
    for (const runner of race.runners) {
      expect(runner.finished).toBe(true);
      expect(runner.finishedAt).toBeGreaterThan(0);
      expect(runner.lap).toBeGreaterThanOrEqual(2);
    }
  });

  it('records a best lap no faster than the car could theoretically go', () => {
    const race = runToFinish(3);
    for (const runner of race.runners) {
      expect(runner.bestLapTime).not.toBeNull();
      expect(runner.bestLapTime ?? 0).toBeGreaterThanOrEqual(runner.pace.lapTime - 0.3);
    }
  });

  it('stops stepping once the race is over', () => {
    const race = runToFinish();
    const settled = race.elapsed;
    stepRace(race, 1 / 60);
    expect(race.elapsed).toBe(settled);
  });
});

describe('traffic', () => {
  it('sees a car that is just ahead in the same lane', () => {
    const race = createRace(track, grid());
    const [first, second] = race.runners;
    second.arc = first.arc + 12;
    second.offset = first.offset;
    expect(blockerFor(first, race.runners, race.line.length)).toBe(second);
  });

  it('ignores a car that is far ahead', () => {
    const race = createRace(track, grid());
    const [first, second] = race.runners;
    second.arc = first.arc + race.line.length / 2;
    second.offset = first.offset;
    expect(blockerFor(first, race.runners, race.line.length)).toBeNull();
  });

  it('ignores a car alongside in another lane', () => {
    const race = createRace(track, grid());
    const [first, second] = race.runners;
    second.arc = first.arc + 12;
    second.offset = first.offset + track.halfWidth * 2;
    expect(blockerFor(first, race.runners, race.line.length)).toBeNull();
  });

  it('never lets two cars occupy the same place on track', () => {
    const race = createRace(track, grid());
    startRace(race);
    for (let tick = 0; tick < 2400; tick++) {
      stepRace(race, 1 / 60);
      for (const runner of race.runners) {
        for (const other of race.runners) {
          if (runner === other || runner.finished || other.finished) continue;
          const apart = Math.hypot(runner.x - other.x, runner.y - other.y);
          expect(apart).toBeGreaterThan(3);
        }
      }
    }
  });
});

describe('standings', () => {
  it('ranks the car furthest round the lap first', () => {
    const race = createRace(track, grid());
    race.runners[2].arc += 400;
    expect(orderOf(race)[0]).toBe(race.runners[2]);
    expect(standings(race)[0].name).toBe(race.runners[2].setup.name);
    expect(standings(race)[0].gap).toBe(0);
  });

  it('reports how far back everyone else is', () => {
    const race = createRace(track, grid());
    race.runners[0].arc += 500;
    const board = standings(race);
    expect(board[0].position).toBe(1);
    for (const entry of board.slice(1)) expect(entry.gap).toBeGreaterThan(0);
  });

  it('reports finishing gaps relative to the winner', () => {
    const race = runToFinish();
    const board = standings(race);
    expect(board[0].finishGap).toBe(0);
    for (const entry of board.slice(1)) {
      expect(entry.finishGap).not.toBeNull();
      expect(entry.finishGap ?? 0).toBeGreaterThan(0);
      expect(entry.finishGap ?? 0).toBeLessThan(entry.finishedAt ?? 0);
    }
  });

  it('ranks finishers by their finishing time, ahead of anyone still running', () => {
    const race = runToFinish();
    const board = standings(race);
    const times = board.map((entry) => entry.finishedAt ?? Infinity);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
