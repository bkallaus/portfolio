import { type RacingLine, planRacingLine } from './racingLine';
import { type Runner, createRunner, stepRunner } from './runner';
import type { CarSetup } from './setup';
import type { Track } from './track';

export type RaceStatus = 'grid' | 'running' | 'finished';

export type Race = {
  track: Track;
  line: RacingLine;
  runners: Runner[];
  elapsed: number;
  laps: number;
  status: RaceStatus;
};

export type Standing = {
  id: string;
  name: string;
  color: string;
  position: number;
  lap: number;
  finished: boolean;
  finishedAt: number | null;
  bestLapTime: number | null;
  speed: number;
  gap: number;
  finishGap: number | null;
};

export const DEFAULT_LAPS = 3;

export function createRace(track: Track, setups: CarSetup[], laps = DEFAULT_LAPS): Race {
  const line = planRacingLine(track);
  return {
    track,
    line,
    runners: setups.map((setup, slot) => createRunner(setup, line, slot, track.halfWidth)),
    elapsed: 0,
    laps,
    status: 'grid',
  };
}

export function startRace(race: Race): void {
  race.status = 'running';
}

export function stepRace(race: Race, dt: number): void {
  if (race.status !== 'running') return;

  race.elapsed += dt;
  for (const runner of race.runners) {
    stepRunner(runner, race.line, race.runners, race.track.halfWidth, race.elapsed, dt);
    if (!runner.finished && runner.lap >= race.laps) {
      runner.finished = true;
      runner.finishedAt = race.elapsed;
    }
  }

  if (race.runners.every((runner) => runner.finished)) race.status = 'finished';
}

export function orderOf(race: Race): Runner[] {
  return [...race.runners].sort((a, b) => {
    if (a.finished && b.finished) return (a.finishedAt ?? 0) - (b.finishedAt ?? 0);
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.arc - a.arc;
  });
}

export function standings(race: Race): Standing[] {
  const ordered = orderOf(race);
  const leader = ordered[0];
  return ordered.map((runner, index) => ({
    id: runner.setup.id,
    name: runner.setup.name,
    color: runner.setup.color,
    position: index + 1,
    lap: Math.min(race.laps, runner.lap + 1),
    finished: runner.finished,
    finishedAt: runner.finishedAt,
    bestLapTime: runner.bestLapTime,
    speed: runner.speed,
    gap: runner === leader ? 0 : leader.arc - runner.arc,
    finishGap:
      runner.finished && leader.finished && runner.finishedAt !== null && leader.finishedAt !== null
        ? runner.finishedAt - leader.finishedAt
        : null,
  }));
}
