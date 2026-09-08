import { describe, expect, it } from 'vitest';
import { NeuralNetwork } from './neuralNetwork';
import { createRng } from './rng';

describe('NeuralNetwork', () => {
  it('produces one bounded output per output node', () => {
    const network = NeuralNetwork.random({ inputs: 4, hidden: [6], outputs: 2 }, 'tanh', createRng(1));
    const output = network.forward([0.2, -0.4, 1, 0.5]);
    expect(output).toHaveLength(2);
    for (const value of output) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same seed and inputs', () => {
    const shape = { inputs: 3, hidden: [5], outputs: 2 };
    const a = NeuralNetwork.random(shape, 'relu', createRng(7));
    const b = NeuralNetwork.random(shape, 'relu', createRng(7));
    expect(a.forward([1, 0, -1])).toEqual(b.forward([1, 0, -1]));
  });

  it('counts weights and biases across every layer', () => {
    const network = NeuralNetwork.random({ inputs: 3, hidden: [4], outputs: 2 }, 'tanh', createRng(2));
    expect(network.parameterCount()).toBe(3 * 4 + 4 + 4 * 2 + 2);
  });

  it('mutates a copy without touching the original', () => {
    const network = NeuralNetwork.random({ inputs: 3, hidden: [4], outputs: 2 }, 'tanh', createRng(3));
    const before = network.forward([0.5, 0.5, 0.5]);
    const mutated = network.mutated(1, 0.5, createRng(9));
    expect(mutated.forward([0.5, 0.5, 0.5])).not.toEqual(before);
    expect(network.forward([0.5, 0.5, 0.5])).toEqual(before);
  });
});
