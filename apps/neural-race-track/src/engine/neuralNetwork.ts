import type { Rng } from './rng';

export type Activation = 'tanh' | 'relu' | 'sigmoid';

export type Layer = { weights: number[]; biases: number[]; inputs: number; outputs: number };

export type NetworkShape = { inputs: number; hidden: number[]; outputs: number };

const activate = (value: number, kind: Activation): number => {
  if (kind === 'relu') return value > 0 ? value : 0;
  if (kind === 'sigmoid') return 1 / (1 + Math.exp(-value));
  return Math.tanh(value);
};

export class NeuralNetwork {
  readonly shape: NetworkShape;
  readonly activation: Activation;
  private readonly layers: Layer[];

  private constructor(shape: NetworkShape, activation: Activation, layers: Layer[]) {
    this.shape = shape;
    this.activation = activation;
    this.layers = layers;
  }

  static sizes(shape: NetworkShape): number[] {
    return [shape.inputs, ...shape.hidden, shape.outputs];
  }

  static random(shape: NetworkShape, activation: Activation, rng: Rng): NeuralNetwork {
    const sizes = NeuralNetwork.sizes(shape);
    const layers: Layer[] = [];
    for (let i = 0; i < sizes.length - 1; i++) {
      const inputs = sizes[i];
      const outputs = sizes[i + 1];
      const scale = Math.sqrt(2 / inputs);
      const weights = Array.from({ length: inputs * outputs }, () => rng.gaussian() * scale);
      const biases = Array.from({ length: outputs }, () => rng.gaussian() * 0.1);
      layers.push({ weights, biases, inputs, outputs });
    }
    return new NeuralNetwork(shape, activation, layers);
  }

  forward(inputs: number[]): number[] {
    let signal = inputs;
    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex++) {
      const layer = this.layers[layerIndex];
      const isOutput = layerIndex === this.layers.length - 1;
      const next = new Array<number>(layer.outputs);
      for (let o = 0; o < layer.outputs; o++) {
        let sum = layer.biases[o];
        for (let i = 0; i < layer.inputs; i++) {
          sum += signal[i] * layer.weights[o * layer.inputs + i];
        }
        next[o] = isOutput ? Math.tanh(sum) : activate(sum, this.activation);
      }
      signal = next;
    }
    return signal;
  }

  clone(): NeuralNetwork {
    const layers = this.layers.map((layer) => ({
      inputs: layer.inputs,
      outputs: layer.outputs,
      weights: layer.weights.slice(),
      biases: layer.biases.slice(),
    }));
    return new NeuralNetwork(this.shape, this.activation, layers);
  }

  mutated(rate: number, amount: number, rng: Rng): NeuralNetwork {
    const copy = this.clone();
    for (const layer of copy.layers) {
      for (let i = 0; i < layer.weights.length; i++) {
        if (rng.next() < rate) layer.weights[i] += rng.gaussian() * amount;
      }
      for (let i = 0; i < layer.biases.length; i++) {
        if (rng.next() < rate) layer.biases[i] += rng.gaussian() * amount;
      }
    }
    return copy;
  }

  parameterCount(): number {
    return this.layers.reduce((total, layer) => total + layer.weights.length + layer.biases.length, 0);
  }
}
