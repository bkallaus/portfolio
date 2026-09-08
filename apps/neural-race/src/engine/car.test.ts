import { type CarSpec, brainInputSize, createCarState, readSensors, sensorAngles, stepCar } from './car';
import { createNetwork } from './network';
import type { Network } from './network';
import { generateTrack } from './track';

const track = generateTrack(2468);

const spec: CarSpec = {
  id: 'test',
  name: 'Test',
  color: '#fff',
  sensors: { count: 5, spreadDegrees: 160, range: 200 },
  chassis: { maxSpeed: 200, acceleration: 180, braking: 250, turnRateDegrees: 160 },
  brain: { hiddenLayers: [], activation: 'tanh', seed: 1, weightScale: 1 },
};

function fixedBrain(steer: number, throttle: number): Network {
  const network = createNetwork(spec.brain, brainInputSize(spec.sensors), 2);
  for (const layer of network.layers) {
    layer.weights.fill(0);
    layer.biases[0] = Math.atanh(steer);
    layer.biases[1] = Math.atanh(throttle);
  }
  return network;
}

describe('sensorAngles', () => {
  it('spreads rays symmetrically around the nose', () => {
    const angles = sensorAngles({ count: 5, spreadDegrees: 180, range: 100 });
    expect(angles).toHaveLength(5);
    expect(angles[0]).toBeCloseTo(-Math.PI / 2);
    expect(angles[2]).toBeCloseTo(0);
    expect(angles[4]).toBeCloseTo(Math.PI / 2);
  });

  it('points a single sensor straight ahead', () => {
    expect(sensorAngles({ count: 1, spreadDegrees: 180, range: 100 })).toEqual([0]);
  });
});

describe('readSensors', () => {
  it('returns one reading per sensor, never beyond its range', () => {
    const state = createCarState(track, 0, 0);
    const readings = readSensors(spec, state, track);
    expect(readings).toHaveLength(spec.sensors.count);
    for (const reading of readings) {
      expect(reading).toBeGreaterThan(0);
      expect(reading).toBeLessThanOrEqual(spec.sensors.range);
    }
  });

  it('sees the side walls closer than the road ahead', () => {
    const state = createCarState(track, 0, 0);
    const readings = readSensors(spec, state, track);
    const straightAhead = readings[2];
    expect(straightAhead).toBeGreaterThan(readings[0]);
    expect(straightAhead).toBeGreaterThan(readings[4]);
    expect(readings[0]).toBeLessThan(track.halfWidth * 2);
  });
});

describe('stepCar', () => {
  it('starts every car on the grid, alive and stationary', () => {
    const state = createCarState(track, 0, 0);
    expect(state).toMatchObject({ alive: true, speed: 0, laps: 0, distance: 0 });
  });

  it('drives forward and gains ground under throttle', () => {
    const state = createCarState(track, 0, 0);
    const brain = fixedBrain(0, 0.99);
    for (let tick = 0; tick < 20; tick++) stepCar(spec, state, brain, track, 1 / 60);
    expect(state.speed).toBeGreaterThan(20);
    expect(state.distance).toBeGreaterThan(0);
    expect(state.alive).toBe(true);
  });

  it('never exceeds the chassis top speed', () => {
    const state = createCarState(track, 0, 0);
    const brain = fixedBrain(0, 0.999);
    for (let tick = 0; tick < 600; tick++) stepCar(spec, state, brain, track, 1 / 60);
    expect(state.speed).toBeLessThanOrEqual(spec.chassis.maxSpeed);
  });

  it('turns the car when the brain asks for steering', () => {
    const state = createCarState(track, 0, 0);
    const heading = state.heading;
    const brain = fixedBrain(0.9, 0.9);
    for (let tick = 0; tick < 20; tick++) stepCar(spec, state, brain, track, 1 / 60);
    expect(state.heading).not.toBeCloseTo(heading);
  });

  it('cannot steer while standing still', () => {
    const state = createCarState(track, 0, 0);
    const heading = state.heading;
    const brain = fixedBrain(0.9, -0.9);
    for (let tick = 0; tick < 10; tick++) stepCar(spec, state, brain, track, 1 / 60);
    expect(state.heading).toBeCloseTo(heading, 5);
  });

  it('crashes a car that drives into the wall', () => {
    const state = createCarState(track, 0, 0);
    const brain = fixedBrain(0.999, 0.999);
    for (let tick = 0; tick < 600 && state.alive; tick++) stepCar(spec, state, brain, track, 1 / 60);
    expect(state.alive).toBe(false);
    expect(state.retirement).toBe('crashed');
  });

  it('retires a car that sits still making no progress', () => {
    const state = createCarState(track, 0, 0);
    const brain = fixedBrain(0, -0.9);
    for (let tick = 0; tick < 600 && state.alive; tick++) stepCar(spec, state, brain, track, 1 / 60);
    expect(state.retirement).toBe('stalled');
  });

  it('leaves a retired car frozen', () => {
    const state = createCarState(track, 0, 0);
    state.alive = false;
    const before = { ...state };
    stepCar(spec, state, fixedBrain(0, 1), track, 1 / 60);
    expect(state).toEqual(before);
  });

  it('feeds the brain one input per sensor plus its speed', () => {
    expect(brainInputSize(spec.sensors)).toBe(spec.sensors.count + 1);
  });
});

describe('lap accounting', () => {
  it('measures distance from the grid slot, not from the start line', () => {
    const behindTheLine = createCarState(track, 0, 30);
    expect(behindTheLine.distance).toBe(0);
    expect(behindTheLine.startArc).toBeGreaterThan(track.length * 0.75);

    const brain = fixedBrain(0, 0.99);
    for (let tick = 0; tick < 120; tick++) stepCar(spec, behindTheLine, brain, track, 1 / 60);

    expect(behindTheLine.arc).toBeLessThan(track.length * 0.25);
    expect(behindTheLine.wraps).toBe(1);
    expect(behindTheLine.distance).toBeGreaterThan(30);
    expect(behindTheLine.distance).toBeLessThan(track.length * 0.2);
    expect(behindTheLine.laps).toBe(0);
  });

  it('counts a lap only after a full circuit of forward progress', () => {
    const state = createCarState(track, 0, 30);
    expect(state.laps).toBe(0);
    state.distance = track.length * 0.99;
    expect(Math.max(0, Math.floor(state.distance / track.length))).toBe(0);
    state.distance = track.length * 1.01;
    expect(Math.max(0, Math.floor(state.distance / track.length))).toBe(1);
  });
});
