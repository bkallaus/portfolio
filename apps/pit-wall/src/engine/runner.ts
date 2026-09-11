import { type Capability, type Pace, type RacingLine, paceLine, positionAtArc } from './racingLine';
import { type CarSetup, capabilityOf } from './setup';

export type Runner = {
  setup: CarSetup;
  capability: Capability;
  pace: Pace;
  arc: number;
  offset: number;
  speed: number;
  lap: number;
  finished: boolean;
  finishedAt: number | null;
  lastLapTime: number | null;
  bestLapTime: number | null;
  lapStartedAt: number;
  x: number;
  y: number;
  heading: number;
};

export const CAR_HALF_WIDTH = 8;
export const CAR_LENGTH = 22;

const BLOCKING_GAP = 34;
const SIDE_BY_SIDE = 15;
const OFF_LINE_PENALTY = 0.16;
const OFFSET_RATE = 34;

export function createRunner(setup: CarSetup, line: RacingLine, gridSlot: number, halfWidth: number): Runner {
  const capability = capabilityOf(setup.stats);
  const pace = paceLine(line, capability);
  const room = Math.max(0, halfWidth - CAR_HALF_WIDTH - 2);
  const offset = room === 0 ? 0 : (gridSlot % 2 === 0 ? -1 : 1) * room * 0.5;
  const arc = line.length - 26 * Math.floor(gridSlot / 2) - 8;
  const placed = positionAtArc(line, arc);

  return {
    setup,
    capability,
    pace,
    arc,
    offset,
    speed: 0,
    lap: 0,
    finished: false,
    finishedAt: null,
    lastLapTime: null,
    bestLapTime: null,
    lapStartedAt: 0,
    x: placed.x,
    y: placed.y,
    heading: placed.heading,
  };
}

function gapAhead(from: Runner, to: Runner, lapLength: number): number {
  const raw = (to.arc - from.arc) % lapLength;
  return raw < 0 ? raw + lapLength : raw;
}

export function blockerFor(runner: Runner, field: Runner[], lapLength: number): Runner | null {
  let closest: Runner | null = null;
  let closestGap = BLOCKING_GAP;
  for (const other of field) {
    if (other === runner || other.finished) continue;
    const gap = gapAhead(runner, other, lapLength);
    if (gap <= 0 || gap >= closestGap) continue;
    if (Math.abs(other.offset - runner.offset) > SIDE_BY_SIDE) continue;
    closest = other;
    closestGap = gap;
  }
  return closest;
}

function passingOffset(blocker: Runner, room: number): number {
  const toLeft = -room - blocker.offset;
  const toRight = room - blocker.offset;
  return Math.abs(toRight) >= Math.abs(toLeft) ? room : -room;
}

export function stepRunner(
  runner: Runner,
  line: RacingLine,
  field: Runner[],
  halfWidth: number,
  elapsed: number,
  dt: number,
): void {
  if (runner.finished) return;

  const room = Math.max(0, halfWidth - CAR_HALF_WIDTH - 2);
  const here = positionAtArc(line, runner.arc);
  const blocker = blockerFor(runner, field, line.length);

  let target = runner.pace.speeds[here.index];
  let wantedOffset = 0;

  if (blocker) {
    wantedOffset = passingOffset(blocker, room);
    const canPass = runner.pace.speeds[here.index] > blocker.pace.speeds[here.index];
    if (!canPass || Math.abs(runner.offset - blocker.offset) < SIDE_BY_SIDE) {
      target = Math.min(target, blocker.speed * 0.99);
    }
  }

  const drift = wantedOffset - runner.offset;
  const move = Math.sign(drift) * Math.min(Math.abs(drift), OFFSET_RATE * dt);
  runner.offset = Math.min(room, Math.max(-room, runner.offset + move));

  const offLine = room === 0 ? 0 : Math.abs(runner.offset) / room;
  target *= 1 - OFF_LINE_PENALTY * offLine;

  if (runner.speed < target) {
    runner.speed = Math.min(target, runner.speed + runner.capability.acceleration * dt);
  } else {
    runner.speed = Math.max(target, runner.speed - runner.capability.braking * dt);
  }

  const before = runner.arc;
  runner.arc += runner.speed * dt;

  const crossed = Math.floor(runner.arc / line.length) - Math.floor(before / line.length);
  if (crossed > 0) {
    runner.lap += crossed;
    if (runner.lap > 1) {
      runner.lastLapTime = elapsed - runner.lapStartedAt;
      runner.bestLapTime =
        runner.bestLapTime === null ? runner.lastLapTime : Math.min(runner.bestLapTime, runner.lastLapTime);
    }
    runner.lapStartedAt = elapsed;
  }

  const placed = positionAtArc(line, runner.arc);
  const normalX = -Math.sin(placed.heading);
  const normalY = Math.cos(placed.heading);
  runner.x = placed.x + normalX * runner.offset;
  runner.y = placed.y + normalY * runner.offset;
  runner.heading = placed.heading;
}

export function distanceCovered(runner: Runner, line: RacingLine): number {
  return runner.arc - (line.length - 8);
}
