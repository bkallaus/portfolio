import { type BrainSpec, createNetwork, describeShape, forward, mutateNetwork, parameterCount } from './network';
import { createRng } from './rng';

const spec = (overrides: Partial<BrainSpec> = {}): BrainSpec => ({
  hiddenLayers: [6, 4],
  activation: 'tanh',
  seed: 5,
  weightScale: 1.2,
  ...overrides,
});

describe('createNetwork', () => {
  it('wires the requested layer sizes end to end', () => {
    const network = createNetwork(spec(), 8, 2);
    expect(network.layers.map((layer) => layer.outputSize)).toEqual([6, 4, 2]);
    expect(network.layers[0].inputSize).toBe(8);
    expect(parameterCount(network)).toBe(8 * 6 + 6 + (6 * 4 + 4) + (4 * 2 + 2));
    expect(describeShape(network)).toBe('8 → 6 → 4 → 2');
  });

  it('supports a direct sensor to control mapping', () => {
    const network = createNetwork(spec({ hiddenLayers: [] }), 5, 2);
    expect(network.layers).toHaveLength(1);
    expect(forward(network, new Float64Array(5))).toHaveLength(2);
  });

  it('ignores zero width hidden layers', () => {
    expect(createNetwork(spec({ hiddenLayers: [4, 0, 3] }), 5, 2).layers).toHaveLength(3);
  });

  it('builds identical weights from the same seed and different ones otherwise', () => {
    expect(createNetwork(spec(), 6, 2).layers[0].weights).toEqual(createNetwork(spec(), 6, 2).layers[0].weights);
    expect(createNetwork(spec(), 6, 2).layers[0].weights).not.toEqual(
      createNetwork(spec({ seed: 6 }), 6, 2).layers[0].weights,
    );
  });
});

describe('forward', () => {
  const inputs = [0.2, 0.9, 0.4, 0.1, 0.7];

  it('keeps controls inside the steering and throttle range', () => {
    for (const activation of ['tanh', 'relu', 'sigmoid'] as const) {
      const outputs = forward(createNetwork(spec({ activation, weightScale: 40 }), 5, 2), inputs);
      expect(outputs).toHaveLength(2);
      for (const value of outputs) {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('is a pure function of its inputs', () => {
    const network = createNetwork(spec(), 5, 2);
    expect(Array.from(forward(network, inputs))).toEqual(Array.from(forward(network, inputs)));
  });

  it('responds differently to different sensor readings', () => {
    const network = createNetwork(spec(), 5, 2);
    expect(Array.from(forward(network, inputs))).not.toEqual(
      Array.from(forward(network, [0.9, 0.1, 0.8, 0.6, 0.2])),
    );
  });

  it('applies the chosen activation to the hidden layer', () => {
    const relu = createNetwork(spec({ activation: 'relu' }), 5, 2);
    const sigmoid = createNetwork(spec({ activation: 'sigmoid' }), 5, 2);
    expect(Array.from(forward(relu, inputs))).not.toEqual(Array.from(forward(sigmoid, inputs)));
  });
});

describe('mutateNetwork', () => {
  it('keeps the shape while moving the weights', () => {
    const network = createNetwork(spec(), 6, 2);
    const mutated = mutateNetwork(network, createRng(3), 1, 0.4);
    expect(mutated.layers.map((layer) => layer.outputSize)).toEqual(
      network.layers.map((layer) => layer.outputSize),
    );
    expect(mutated.layers[0].weights).not.toEqual(network.layers[0].weights);
    expect(network.layers[0].weights).toEqual(createNetwork(spec(), 6, 2).layers[0].weights);
  });

  it('leaves the parent untouched at a zero mutation rate', () => {
    const network = createNetwork(spec(), 6, 2);
    const mutated = mutateNetwork(network, createRng(3), 0, 0.4);
    expect(mutated.layers[0].weights).toEqual(network.layers[0].weights);
  });
});
