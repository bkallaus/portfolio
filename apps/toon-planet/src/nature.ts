import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import { DynamicInstances, InstanceBatch, surfaceBasis } from './instancing.ts';
import { pick, type Random, range } from './noise.ts';
import { PLANET_RADIUS, randomDirection, type Terrain, tangentFrame } from './terrain.ts';
import { toonMaterial } from './toonMaterial.ts';

const leafColors = ['#3ecf5a', '#2fb84f', '#8be04e', '#56d364', '#1fa856', '#b5e655'];
const blossomColors = ['#ff8fc7', '#ffb347', '#ff6f91'];
const pineColors = ['#1f9e6e', '#16876b', '#2bb07f'];

export function createTrees(terrain: Terrain, extraSpots: Vector3[], random: Random): Group {
  const group = new Group();
  const trunks = new InstanceBatch();
  const crowns = new InstanceBatch();
  const pines = new InstanceBatch();
  const matrix = new Matrix4();
  const local = new Matrix4();
  const hint = new Vector3();

  const wild = terrain.findLandSpots(2600, 5, (direction, height) => {
    if (height < 0.07 || height > 0.72) return false;
    if (terrain.settlementWeight(direction.x, direction.y, direction.z) > 0.02) return false;
    return true;
  });

  const plant = (position: Vector3, pine: boolean, size: number) => {
    hint.set(random() - 0.5, random() - 0.5, random() - 0.5);
    surfaceBasis(position, hint, matrix);
    trunks.add(local.makeScale(0.018 * size, 0.06 * size, 0.018 * size).premultiply(matrix), '#8b5a2b');
    if (pine) {
      pines.add(
        local.makeScale(0.09 * size, 0.13 * size, 0.09 * size).premultiply(new Matrix4().makeTranslation(0, 0.035 * size, 0)).premultiply(matrix),
        pick(random, pineColors),
      );
      pines.add(
        local.makeScale(0.065 * size, 0.1 * size, 0.065 * size).premultiply(new Matrix4().makeTranslation(0, 0.1 * size, 0)).premultiply(matrix),
        pick(random, pineColors),
      );
    } else {
      const color = random() < 0.12 ? pick(random, blossomColors) : pick(random, leafColors);
      crowns.add(
        local.makeScale(0.05 * size, 0.055 * size, 0.05 * size).premultiply(new Matrix4().makeTranslation(0, 0.085 * size, 0)).premultiply(matrix),
        color,
      );
    }
  };

  for (const direction of wild) {
    const height = terrain.heightAtDirection(direction);
    const position = direction.clone().multiplyScalar(PLANET_RADIUS + height - 0.01);
    plant(position, height > 0.36 || random() < 0.15, range(random, 0.9, 1.7));
  }
  for (const spot of extraSpots) plant(spot, false, range(random, 0.7, 1.1));

  const trunkGeometry = new CylinderGeometry(0.6, 1, 1, 6).translate(0, 0.5, 0);
  const crownGeometry = new IcosahedronGeometry(1, 1);
  crownGeometry.computeVertexNormals();
  const pineGeometry = new ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0).toNonIndexed();
  pineGeometry.computeVertexNormals();
  group.add(trunks.build(trunkGeometry, toonMaterial('#ffffff')));
  group.add(crowns.build(crownGeometry, toonMaterial('#ffffff')));
  group.add(pines.build(pineGeometry, toonMaterial('#ffffff')));
  return group;
}

type Cloud = { axis: Vector3; speed: number; phase: number; parts: { index: number; local: Matrix4 }[] };

export function createClouds(random: Random): { mesh: Mesh; update(time: number): void } {
  const puffs = new DynamicInstances(new IcosahedronGeometry(1, 2), toonMaterial('#ffffff'), 200);
  const clouds: Cloud[] = [];
  for (let c = 0; c < 24; c++) {
    const direction = randomDirection(random);
    const altitude = PLANET_RADIUS + range(random, 2.55, 3.2);
    const anchor = direction.clone().multiplyScalar(altitude);
    const basis = surfaceBasis(anchor, new Vector3(random() - 0.5, random() - 0.5, random() - 0.5), new Matrix4());
    const count = 4 + Math.floor(random() * 4);
    const size = range(random, 0.7, 1.25);
    const parts: Cloud['parts'] = [];
    for (let p = 0; p < count; p++) {
      const t = count === 1 ? 0 : p / (count - 1) - 0.5;
      const radius = size * (0.42 - Math.abs(t) * 0.35) * range(random, 0.8, 1.15);
      const local = new Matrix4()
        .makeScale(radius * 1.1, radius * 0.85, radius)
        .premultiply(new Matrix4().makeTranslation(t * size * 1.3, range(random, -0.02, 0.12) * size, range(random, -0.18, 0.18) * size))
        .premultiply(basis);
      parts.push({ index: puffs.allocate(random() < 0.2 ? '#f2f7ff' : '#ffffff'), local });
    }
    const axis = tangentFrame(direction).tangent;
    clouds.push({ axis, speed: range(random, 0.012, 0.03), phase: random() * 10, parts });
  }

  const rotation = new Matrix4();
  const quaternion = new Quaternion();
  const update = (time: number) => {
    for (const cloud of clouds) {
      quaternion.setFromAxisAngle(cloud.axis, cloud.speed * time + cloud.phase * 0.01);
      rotation.makeRotationFromQuaternion(quaternion);
      for (const part of cloud.parts) puffs.set(part.index, rotation, part.local);
    }
    puffs.commit();
  };
  update(0);
  return { mesh: puffs.mesh, update };
}

export function createWindmills(terrain: Terrain, random: Random): { group: Group; update(time: number): void } {
  const group = new Group();
  const rotors: Group[] = [];
  const white = toonMaterial('#fdfdfd');
  const red = toonMaterial('#ff4d6d');
  const spots = terrain.findLandSpots(9, 17, (direction, height) => {
    if (height < 0.1 || height > 0.4) return false;
    const settled = terrain.settlementWeight(direction.x, direction.y, direction.z);
    return settled < 0.02 && terrain.town.center.angleTo(direction) < 0.6;
  });
  const extra = spots.length < 5 ? terrain.findLandSpots(8, 23, (d, h) => h > 0.1 && h < 0.35 && terrain.settlementWeight(d.x, d.y, d.z) < 0.02) : [];
  for (const direction of [...spots, ...extra]) {
    const height = terrain.heightAtDirection(direction);
    const mill = new Group();
    mill.matrixAutoUpdate = false;
    surfaceBasis(direction.clone().multiplyScalar(PLANET_RADIUS + height - 0.01), new Vector3(random(), random(), random()), mill.matrix);
    const tower = new Mesh(new CylinderGeometry(0.012, 0.024, 0.3, 8).translate(0, 0.15, 0), white);
    const cap = new Mesh(new BoxGeometry(0.03, 0.03, 0.05), red);
    cap.position.set(0, 0.3, 0.005);
    const rotor = new Group();
    rotor.position.set(0, 0.3, 0.035);
    for (let b = 0; b < 3; b++) {
      const blade = new Mesh(new BoxGeometry(0.018, 0.15, 0.004).translate(0, 0.08, 0), b === 0 ? red : white);
      blade.rotation.z = (b / 3) * Math.PI * 2;
      rotor.add(blade);
    }
    rotor.rotation.z = random() * Math.PI;
    rotors.push(rotor);
    mill.add(tower, cap, rotor);
    for (const child of [tower, cap, ...rotor.children]) child.castShadow = true;
    group.add(mill);
  }
  let last = 0;
  return {
    group,
    update(time: number) {
      const dt = time - last;
      last = time;
      rotors.forEach((rotor, i) => {
        rotor.rotation.z += dt * (1.6 + (i % 3) * 0.4);
      });
    },
  };
}
