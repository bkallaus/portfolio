import {
  Color,
  type ColorRepresentation,
  DataTexture,
  MeshToonMaterial,
  type MeshToonMaterialParameters,
  NearestFilter,
  RedFormat,
} from 'three';

export const sharedUniforms = {
  uTime: { value: 0 },
  uSunIntensity: { value: 3 },
  uDotSize: { value: 6 },
};

const toonGradient = (() => {
  const texture = new DataTexture(new Uint8Array([60, 150, 255]), 3, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

type ToonOptions = MeshToonMaterialParameters & {
  windows?: boolean;
  waves?: boolean;
};

const halftoneChunk = `
  float toonSunLum = dot(reflectedLight.directDiffuse, vec3(0.3333));
  float toonBaseLum = max(dot(diffuseColor.rgb, vec3(0.3333)) * RECIPROCAL_PI * uSunIntensity, 1e-4);
  float toonLit = clamp(toonSunLum / toonBaseLum, 0.0, 1.0);
  vec2 toonCell = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uDotSize;
  float toonDist = length(fract(toonCell) - 0.5);
  float toonRadius = (1.0 - smoothstep(0.05, 0.55, toonLit)) * 0.34;
  float toonInk = (1.0 - smoothstep(toonRadius - 0.06, toonRadius, toonDist)) * step(0.02, toonRadius);
  outgoingLight = mix(outgoingLight, outgoingLight * 0.55 + vec3(0.02, 0.0, 0.06), toonInk);
`;

const windowVertexPars = `
  varying vec3 vWinPos;
  varying vec3 vWinNormal;
  varying vec3 vWinSize;
`;

const windowVertex = `
  #ifdef USE_INSTANCING
    vWinSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #else
    vWinSize = vec3(1.0);
  #endif
  vWinPos = position * vWinSize;
  vWinNormal = normal;
`;

const windowFragmentPars = `
  varying vec3 vWinPos;
  varying vec3 vWinNormal;
  varying vec3 vWinSize;
  float windowHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float windowMask(out float lightOn) {
    lightOn = 0.0;
    if (abs(vWinNormal.y) > 0.5) return 0.0;
    float across = abs(vWinNormal.x) > 0.5 ? vWinPos.z : vWinPos.x;
    float up = vWinPos.y;
    float column = across / 0.034;
    float row = up / 0.04;
    vec2 f = fract(vec2(column, row));
    float inside = step(0.28, f.x) * step(f.x, 0.72) * step(0.3, f.y) * step(f.y, 0.8);
    float topGap = step(up, vWinSize.y - 0.025);
    float groundGap = step(0.03, up);
    float sideGap = step(abs(across), (abs(vWinNormal.x) > 0.5 ? vWinSize.z : vWinSize.x) * 0.5 - 0.01);
    lightOn = step(0.45, windowHash(floor(vec2(column, row)) + vWinNormal.xz * 17.0 + floor(vWinSize.xy * 97.0)));
    return inside * topGap * groundGap * sideGap;
  }
`;

const windowColorChunk = `
  float winLightOn;
  float winMask = windowMask(winLightOn);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.85, 1.0), winMask);
`;

const windowGlowChunk = `
  float nightness = 1.0 - smoothstep(0.0, 0.35, toonLit);
  outgoingLight = mix(outgoingLight, vec3(1.0, 0.82, 0.35) * 1.4, winMask * winLightOn * nightness);
`;

const wavesFragmentPars = `
  varying vec3 vWavePos;
`;

const wavesChunk = `
  vec3 wp = vWavePos;
  float wave = sin(wp.x * 5.0 + sin(wp.z * 3.0 + uTime * 0.6) * 1.8 + uTime * 0.8)
             * sin(wp.y * 5.5 + sin(wp.x * 4.0 - uTime * 0.5) * 1.8 - uTime * 0.6);
  float foam = smoothstep(0.86, 0.9, wave);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.98, 1.0), foam);
  diffuseColor.a = mix(diffuseColor.a, 1.0, foam);
`;

export function toonMaterial(color: ColorRepresentation, options: ToonOptions = {}): MeshToonMaterial {
  const { windows = false, waves = false, ...parameters } = options;
  const material = new MeshToonMaterial({ color: new Color(color), gradientMap: toonGradient, ...parameters });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform float uTime;\nuniform float uSunIntensity;\nuniform float uDotSize;\n${
          windows ? windowFragmentPars : ''
        }${waves ? wavesFragmentPars : ''}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n${windows ? windowColorChunk : ''}${waves ? wavesChunk : ''}`,
      )
      .replace(
        '#include <opaque_fragment>',
        `${halftoneChunk}${windows ? windowGlowChunk : ''}\n#include <opaque_fragment>`,
      );
    if (windows) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${windowVertexPars}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${windowVertex}`);
    }
    if (waves) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWavePos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWavePos = position;');
    }
  };
  material.customProgramCacheKey = () => `toon-${windows}-${waves}`;
  return material;
}
