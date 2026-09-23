import type { WebGLRenderer } from 'three';

export type Quality = {
  pixelRatio: number;
  shadowMapSize: number;
  samples: number;
  terrainDetail: number;
  shadows: boolean;
  effects: boolean;
};

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

export function isConstrainedDevice(): boolean {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 820;
  const lowMemory = ((navigator as NavigatorWithMemory).deviceMemory ?? 8) <= 4;
  return coarse || smallScreen || lowMemory;
}

export function chooseQuality(renderer: WebGLRenderer, constrained: boolean, safeLevel: number): Quality {
  const { maxTextureSize, maxSamples } = renderer.capabilities;
  return {
    pixelRatio: Math.min(window.devicePixelRatio, constrained ? 1.5 : 2),
    shadowMapSize: Math.min(constrained ? 2048 : 4096, maxTextureSize),
    samples: constrained ? 0 : Math.min(4, maxSamples),
    terrainDetail: constrained ? 64 : 96,
    shadows: safeLevel < 1,
    effects: safeLevel < 2,
  };
}
