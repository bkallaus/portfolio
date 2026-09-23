import {
  BackSide,
  BufferAttribute,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createNoise3, createRandom, smoothstep } from './noise.ts';
import { PLANET_RADIUS, type Terrain } from './terrain.ts';
import { toonMaterial } from './toonMaterial.ts';

export const GLOW_LAYER = 1;

const palette = {
  abyss: new Color('#1d3fb8'),
  shallows: new Color('#6ff3ff'),
  sand: new Color('#ffe08a'),
  meadow: new Color('#7ee04f'),
  forest: new Color('#2fb35a'),
  highland: new Color('#b98a5a'),
  rock: new Color('#8f6fb8'),
  snow: new Color('#ffffff'),
  plaza: new Color('#f2dcc0'),
};

function surfaceColor(height: number, mountain: number, speckle: number, settled: number, target: Color): Color {
  if (height < -0.01) {
    return target.copy(palette.abyss).lerp(palette.shallows, smoothstep(-0.6, -0.02, height));
  }
  if (height < 0.05 + speckle * 0.02) target.copy(palette.sand);
  else if (mountain < 0.25) target.copy(palette.meadow).lerp(palette.forest, smoothstep(-0.2, 0.4, speckle));
  else if (height < 0.78 + speckle * 0.12) {
    target.copy(palette.forest).lerp(palette.highland, smoothstep(0.3, 0.6, height));
    target.lerp(palette.rock, smoothstep(0.55, 0.75, height));
  } else target.copy(palette.snow);
  return target.lerp(palette.plaza, smoothstep(0.55, 0.9, settled));
}

export function createPlanet(terrain: Terrain): { group: Group; terrainMesh: Mesh; oceanMesh: Mesh } {
  const group = new Group();

  const base = new IcosahedronGeometry(1, 96);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const geometry = mergeVertices(base);
  base.dispose();

  const speckleNoise = createNoise3(createRandom(11));
  const positions = geometry.getAttribute('position') as BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const direction = new Vector3();
  const color = new Color();
  for (let i = 0; i < positions.count; i++) {
    direction.fromBufferAttribute(positions, i).normalize();
    const height = terrain.heightAtDirection(direction);
    const settled = terrain.settlementWeight(direction.x, direction.y, direction.z);
    const mountain = terrain.mountainAt(direction.x, direction.y, direction.z) * (1 - settled);
    const speckle = speckleNoise(direction.x * 9, direction.y * 9, direction.z * 9);
    surfaceColor(height, mountain, speckle, terrain.city.center.angleTo(direction) < terrain.city.angularRadius * 0.9 ? settled : 0, color);
    color.toArray(colors, i * 3);
    positions.setXYZ(
      i,
      direction.x * (PLANET_RADIUS + height),
      direction.y * (PLANET_RADIUS + height),
      direction.z * (PLANET_RADIUS + height),
    );
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const terrainMesh = new Mesh(geometry, toonMaterial('#ffffff', { vertexColors: true }));
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);

  const oceanMesh = new Mesh(
    new IcosahedronGeometry(PLANET_RADIUS, 48),
    toonMaterial('#1e9bff', { transparent: true, opacity: 0.72, waves: true }),
  );
  oceanMesh.receiveShadow = true;
  group.add(oceanMesh);

  group.add(createAtmosphere());
  return { group, terrainMesh, oceanMesh };
}

function createAtmosphere(): Mesh {
  const material = new ShaderMaterial({
    side: BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new Color('#7fd8ff') } },
    vertexShader: `
      varying vec3 vNormalView;
      void main() {
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormalView;
      void main() {
        float facing = abs(vNormalView.z);
        float band = step(0.04, facing) * 0.22 + step(0.16, facing) * 0.2 + step(0.3, facing) * 0.18;
        gl_FragColor = vec4(uColor, band);
      }
    `,
  });
  const atmosphere = new Mesh(new IcosahedronGeometry(PLANET_RADIUS * 1.1, 12), material);
  atmosphere.layers.set(GLOW_LAYER);
  return atmosphere;
}
