import { type Rng, createRng, gaussian } from './rng';

export type Activation = 'tanh' | 'relu' | 'sigmoid';

export const ACTIVATIONS: Activation[] = ['tanh', 'relu', 'sigmoid'];

export type BrainSpec = {
  hiddenLayers: number[];
  activation: Activation;
  seed: number;
  weightScale: number;
};

export type Layer = {
  inputSize: number;
  outputSize: number;
  weights: Float64Array;
  biases: Float64Array;
};

export type Network = {
  spec: BrainSpec;
  inputSize: number;
  outputSize: number;
  layers: Layer[];
};

const activate = (value: number, activation: Activation): number => {
  if (activation === 'relu') return value > 0 ? value : 0;
  if (activation === 'sigmoid') return 1 / (1 + Math.exp(-value));
  return Math.tanh(value);
};

function createLayer(inputSize: number, outputSize: number, rng: Rng, scale: number): Layer {
  const weights = new Float64Array(inputSize * outputSize);
  const biases = new Float64Array(outputSize);
  const spread = scale / Math.sqrt(inputSize);
  for (let i = 0; i < weights.length; i++) weights[i] = gaussian(rng) * spread;
  for (let i = 0; i < biases.length; i++) biases[i] = gaussian(rng) * spread * 0.5;
  return { inputSize, outputSize, weights, biases };
}

export function createNetwork(spec: BrainSpec, inputSize: number, outputSize: number): Network {
  const rng = createRng(spec.seed);
  const sizes = [inputSize, ...spec.hiddenLayers.filter((size) => size > 0), outputSize];
  const layers: Layer[] = [];
  for (let i = 0; i < sizes.length - 1; i++) {
    layers.push(createLayer(sizes[i], sizes[i + 1], rng, spec.weightScale));
  }
  return { spec, inputSize, outputSize, layers };
}

export function forward(network: Network, inputs: Float64Array | number[]): Float64Array {
  let signal = inputs instanceof Float64Array ? inputs : Float64Array.from(inputs);

  network.layers.forEach((layer, layerIndex) => {
    const isOutputLayer = layerIndex === network.layers.length - 1;
    const next = new Float64Array(layer.outputSize);
    for (let out = 0; out < layer.outputSize; out++) {
      let sum = layer.biases[out];
      const offset = out * layer.inputSize;
      for (let input = 0; input < layer.inputSize; input++) {
        sum += layer.weights[offset + input] * signal[input];
      }
      next[out] = isOutputLayer ? Math.tanh(sum) : activate(sum, network.spec.activation);
    }
    signal = next;
  });

  return signal;
}

export function cloneNetwork(network: Network): Network {
  return {
    ...network,
    layers: network.layers.map((layer) => ({
      ...layer,
      weights: Float64Array.from(layer.weights),
      biases: Float64Array.from(layer.biases),
    })),
  };
}

export function mutateNetwork(network: Network, rng: Rng, rate: number, amount: number): Network {
  const mutated = cloneNetwork(network);
  for (const layer of mutated.layers) {
    for (let i = 0; i < layer.weights.length; i++) {
      if (rng() < rate) layer.weights[i] += gaussian(rng) * amount;
    }
    for (let i = 0; i < layer.biases.length; i++) {
      if (rng() < rate) layer.biases[i] += gaussian(rng) * amount;
    }
  }
  return mutated;
}

export function parameterCount(network: Network): number {
  return network.layers.reduce((total, layer) => total + layer.weights.length + layer.biases.length, 0);
}

export function describeShape(network: Network): string {
  return [network.inputSize, ...network.layers.map((layer) => layer.outputSize)].join(' → ');
}
