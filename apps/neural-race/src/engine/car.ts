import { castRay } from './geometry';
import { type Network, forward } from './network';
import type { BrainSpec } from './network';
import { type Track, locateOnTrack } from './track';

export type SensorSpec = { count: number; spreadDegrees: number; range: number };
export type ChassisSpec = {
  maxSpeed: number;
  acceleration: number;
  braking: number;
  turnRateDegrees: number;
};

export type CarSpec = {
  id: string;
  name: string;
  color: string;
  sensors: SensorSpec;
  chassis: ChassisSpec;
  brain: BrainSpec;
};

export type CarState = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  alive: boolean;
  retirement: 'crashed' | 'stalled' | null;
  trackIndex: number;
  arc: number;
  startArc: number;
  wraps: number;
  laps: number;
  distance: number;
  furthest: number;
  aliveFor: number;
  sinceProgress: number;
  sensorReadings: number[];
  steer: number;
  throttle: number;
};

export const BRAIN_OUTPUT_SIZE = 2;
export const CAR_HALF_WIDTH = 8;
export const CAR_LENGTH = 22;

const STALL_TIMEOUT = 2.6;

export function brainInputSize(sensors: SensorSpec): number {
  return sensors.count + 1;
}

export function sensorAngles(sensors: SensorSpec): number[] {
  const spread = (sensors.spreadDegrees * Math.PI) / 180;
  if (sensors.count <= 1) return [0];
  const angles: number[] = [];
  for (let i = 0; i < sensors.count; i++) {
    angles.push(-spread / 2 + (spread * i) / (sensors.count - 1));
  }
  return angles;
}

export function createCarState(track: Track, laneOffset: number, rowOffset: number): CarState {
  const { heading } = track.start;
  const normal = track.normals[0];
  const x = track.start.x + normal.x * laneOffset - Math.cos(heading) * rowOffset;
  const y = track.start.y + normal.y * laneOffset - Math.sin(heading) * rowOffset;
  const location = locateOnTrack(track, x, y, -1);

  return {
    x,
    y,
    heading,
    speed: 0,
    alive: true,
    retirement: null,
    trackIndex: location.index,
    arc: location.arc,
    startArc: location.arc,
    wraps: 0,
    laps: 0,
    distance: 0,
    furthest: 0,
    aliveFor: 0,
    sinceProgress: 0,
    sensorReadings: sensorAngles({ count: 0, spreadDegrees: 0, range: 0 }),
    steer: 0,
    throttle: 0,
  };
}

export function readSensors(spec: CarSpec, state: CarState, track: Track): number[] {
  const readings: number[] = [];
  for (const angle of sensorAngles(spec.sensors)) {
    const direction = state.heading + angle;
    readings.push(
      castRay(
        track.wallIndex,
        state.x,
        state.y,
        Math.cos(direction),
        Math.sin(direction),
        spec.sensors.range,
      ),
    );
  }
  return readings;
}

export function stepCar(spec: CarSpec, state: CarState, brain: Network, track: Track, dt: number): void {
  if (!state.alive) return;

  const readings = readSensors(spec, state, track);
  const inputs = new Float64Array(brainInputSize(spec.sensors));
  for (let i = 0; i < readings.length; i++) inputs[i] = readings[i] / spec.sensors.range;
  inputs[readings.length] = state.speed / spec.chassis.maxSpeed;

  const controls = forward(brain, inputs);
  const steer = controls[0];
  const throttle = controls[1];

  const pedal = throttle >= 0 ? throttle * spec.chassis.acceleration : throttle * spec.chassis.braking;
  const nextSpeed = Math.min(
    spec.chassis.maxSpeed,
    Math.max(0, (state.speed + pedal * dt) * (1 - 0.35 * dt)),
  );
  const grip = Math.min(1, nextSpeed / (spec.chassis.maxSpeed * 0.35));
  const heading = state.heading + steer * ((spec.chassis.turnRateDegrees * Math.PI) / 180) * grip * dt;

  const x = state.x + Math.cos(heading) * nextSpeed * dt;
  const y = state.y + Math.sin(heading) * nextSpeed * dt;
  const location = locateOnTrack(track, x, y, state.trackIndex);

  const previousArc = state.arc;
  let wraps = state.wraps;
  if (previousArc > track.length * 0.75 && location.arc < track.length * 0.25) wraps += 1;
  if (previousArc < track.length * 0.25 && location.arc > track.length * 0.75) wraps -= 1;

  const distance = wraps * track.length + location.arc - state.startArc;
  const progressed = distance > state.distance + 0.5;

  state.x = x;
  state.y = y;
  state.heading = heading;
  state.speed = nextSpeed;
  state.sensorReadings = readings;
  state.steer = steer;
  state.throttle = throttle;
  state.trackIndex = location.index;
  state.arc = location.arc;
  state.wraps = wraps;
  state.distance = distance;
  state.furthest = Math.max(state.furthest, distance);
  state.laps = Math.max(0, Math.floor(distance / track.length));
  state.aliveFor += dt;
  state.sinceProgress = progressed ? 0 : state.sinceProgress + dt;

  if (Math.abs(location.lateral) > track.halfWidth - CAR_HALF_WIDTH) {
    state.alive = false;
    state.retirement = 'crashed';
  } else if (state.sinceProgress > STALL_TIMEOUT) {
    state.alive = false;
    state.retirement = 'stalled';
  }
}
