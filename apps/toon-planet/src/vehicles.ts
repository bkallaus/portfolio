import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  type Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { DynamicInstances, surfaceBasis } from './instancing.ts';
import { type Random, range } from './noise.ts';
import { PLANET_RADIUS, type Terrain, tangentFrame } from './terrain.ts';
import { toonMaterial } from './toonMaterial.ts';

export type Tracked = {
  position: Vector3;
  forward: Vector3;
};

class PuffTrail {
  readonly mesh;
  private readonly instances: DynamicInstances;
  private readonly slots: { index: number; born: number; life: number; size: number; position: Vector3 }[] = [];
  private next = 0;
  private readonly matrix = new Matrix4();

  constructor(capacity: number) {
    this.instances = new DynamicInstances(new IcosahedronGeometry(1, 1), toonMaterial('#ffffff'), capacity, false);
    for (let i = 0; i < capacity; i++) {
      this.slots.push({ index: this.instances.allocate(), born: -100, life: 1, size: 0, position: new Vector3() });
    }
    this.mesh = this.instances.mesh;
  }

  emit(position: Vector3, time: number, size: number, life: number): void {
    const slot = this.slots[this.next];
    this.next = (this.next + 1) % this.slots.length;
    slot.position.copy(position);
    slot.born = time;
    slot.size = size;
    slot.life = life;
  }

  update(time: number): void {
    for (const slot of this.slots) {
      const age = (time - slot.born) / slot.life;
      const s = age >= 0 && age < 1 ? slot.size * Math.sin(Math.PI * Math.sqrt(age)) : 0;
      this.matrix.makeScale(s, s, s).setPosition(slot.position);
      this.instances.set(slot.index, this.matrix);
    }
    this.instances.commit();
  }
}

type Plane = Tracked & {
  model: Group;
  propeller: Object3D;
  axisA: Vector3;
  axisB: Vector3;
  wobbleAxis: Vector3;
  altitude: number;
  speed: number;
  phase: number;
  lastPuff: number;
};

function buildPlane(body: string, wing: string): { model: Group; propeller: Object3D } {
  const model = new Group();
  const bodyMaterial = toonMaterial(body);
  const wingMaterial = toonMaterial(wing);
  const glass = toonMaterial('#a8ecff');
  const parts: Mesh[] = [];
  const add = (mesh: Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    parts.push(mesh);
    model.add(mesh);
    return mesh;
  };
  add(new Mesh(new CylinderGeometry(0.04, 0.022, 0.34, 12).rotateX(Math.PI / 2), bodyMaterial), 0, 0, 0);
  add(new Mesh(new SphereGeometry(0.04, 12, 10), bodyMaterial), 0, 0, 0.17);
  add(new Mesh(new SphereGeometry(0.03, 12, 10).scale(0.9, 0.8, 1.4), glass), 0, 0.03, 0.06);
  add(new Mesh(new BoxGeometry(0.5, 0.014, 0.085), wingMaterial), 0, -0.01, 0.04);
  add(new Mesh(new BoxGeometry(0.17, 0.01, 0.05), wingMaterial), 0, 0.005, -0.15);
  add(new Mesh(new BoxGeometry(0.012, 0.08, 0.06), wingMaterial), 0, 0.045, -0.15);
  const propeller = new Group();
  propeller.position.set(0, 0, 0.215);
  const blade = new Mesh(new BoxGeometry(0.16, 0.016, 0.006), toonMaterial('#333344'));
  const hub = new Mesh(new SphereGeometry(0.014, 8, 6), toonMaterial('#ffd23f'));
  propeller.add(blade, hub);
  model.add(propeller);
  for (const part of [...parts, blade]) part.castShadow = true;
  model.scale.setScalar(1.3);
  return { model, propeller };
}

function buildBoat(hullColor: string): Group {
  const boat = new Group();
  const parts = [
    new Mesh(new BoxGeometry(0.07, 0.03, 0.17).translate(0, 0.005, 0), toonMaterial(hullColor)),
    new Mesh(new BoxGeometry(0.06, 0.012, 0.15).translate(0, 0.026, 0), toonMaterial('#fff7e6')),
    new Mesh(new BoxGeometry(0.04, 0.03, 0.045).translate(0, 0.045, -0.035), toonMaterial('#ffffff')),
    new Mesh(new CylinderGeometry(0.003, 0.003, 0.16, 5).translate(0, 0.11, 0.03), toonMaterial('#6b4f2a')),
    new Mesh(new CylinderGeometry(0, 0.06, 0.13, 3).scale(0.12, 1, 1).translate(0, 0.1, 0.06), toonMaterial('#ffffff')),
  ];
  for (const part of parts) {
    part.castShadow = true;
    boat.add(part);
  }
  return boat;
}

function buildBalloon(colors: string[]): { balloon: Group } {
  const balloon = new Group();
  const envelopeGeometry = new SphereGeometry(0.16, 16, 12).toNonIndexed();
  envelopeGeometry.scale(1, 1.18, 1);
  const positions = envelopeGeometry.getAttribute('position');
  const colorArray = new Float32Array(positions.count * 3);
  const color = new Color();
  for (let i = 0; i < positions.count; i += 3) {
    const cx = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
    const cz = (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3;
    const sector = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 8) % colors.length;
    color.set(colors[sector]);
    for (let k = 0; k < 3; k++) color.toArray(colorArray, (i + k) * 3);
  }
  envelopeGeometry.setAttribute('color', new BufferAttribute(colorArray, 3));
  const envelope = new Mesh(envelopeGeometry, toonMaterial('#ffffff', { vertexColors: true }));
  envelope.position.y = 0.3;
  const basket = new Mesh(new BoxGeometry(0.06, 0.05, 0.06), toonMaterial('#b07a3c'));
  basket.position.y = 0.03;
  const ropeMaterial = toonMaterial('#5a3d1e');
  balloon.add(envelope, basket);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const rope = new Mesh(new CylinderGeometry(0.002, 0.002, 0.14, 4), ropeMaterial);
    rope.position.set(x * 0.035, 0.12, z * 0.035);
    rope.rotation.set(z * 0.18, 0, -x * 0.18);
    balloon.add(rope);
  }
  for (const child of balloon.children) child.castShadow = true;
  return { balloon };
}

export type Vehicles = {
  group: Group;
  planes: Tracked[];
  update(time: number, dt: number): void;
};

export function createVehicles(terrain: Terrain, random: Random): Vehicles {
  const group = new Group();
  const trail = new PuffTrail(420);
  group.add(trail.mesh);

  const planeStyles: [string, string][] = [
    ['#ff3b5c', '#ffd23f'],
    ['#2f80ff', '#ffffff'],
    ['#ff8c1a', '#3ddc84'],
    ['#b86bff', '#ffe066'],
  ];
  const planes: Plane[] = planeStyles.map(([body, wing], i) => {
    const { model, propeller } = buildPlane(body, wing);
    model.matrixAutoUpdate = false;
    group.add(model);
    const normal = new Vector3(range(random, -1, 1), range(random, -1, 1), range(random, -1, 1)).normalize();
    const { tangent, bitangent } = tangentFrame(normal);
    return {
      model,
      propeller,
      axisA: tangent,
      axisB: bitangent,
      wobbleAxis: new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      altitude: PLANET_RADIUS + 2.2 + i * 0.1,
      speed: range(random, 0.07, 0.1) * (i % 2 === 0 ? 1 : -1),
      phase: random() * Math.PI * 2,
      lastPuff: 0,
      position: new Vector3(),
      forward: new Vector3(),
    };
  });

  const boatColors = ['#e63946', '#3a86ff', '#ffbe0b', '#8338ec', '#fb5607', '#06d6a0'];
  const boats = terrain.findOceanLoops(6, 31).map((loop, i) => {
    const model = buildBoat(boatColors[i % boatColors.length]);
    model.matrixAutoUpdate = false;
    group.add(model);
    return { loop, model, ...tangentFrame(loop.center), speed: range(random, 0.05, 0.09) * (i % 2 ? 1 : -1), phase: random() * 10, lastPuff: 0 };
  });

  const balloonSpots = terrain.findLandSpots(5, 41, (d, h) => h > 0.05 && h < 0.5 && terrain.settlementWeight(d.x, d.y, d.z) < 0.5);
  const balloonPalettes = [
    ['#ff006e', '#ffbe0b'],
    ['#3a86ff', '#ffffff'],
    ['#8338ec', '#06d6a0'],
    ['#fb5607', '#ffe066'],
    ['#ff595e', '#1982c4'],
  ];
  const balloons = balloonSpots.map((center, i) => {
    const { balloon } = buildBalloon(balloonPalettes[i % balloonPalettes.length]);
    balloon.matrixAutoUpdate = false;
    group.add(balloon);
    return { center, balloon, ...tangentFrame(center), phase: random() * 10, base: terrain.heightAtDirection(center) };
  });

  const quaternion = new Quaternion();
  const position = new Vector3();
  const ahead = new Vector3();
  const tail = new Vector3();
  const roll = new Matrix4();
  const pathPoint = (plane: Plane, time: number, target: Vector3) => {
    const angle = plane.phase + plane.speed * time;
    target.copy(plane.axisA).multiplyScalar(Math.cos(angle)).addScaledVector(plane.axisB, Math.sin(angle));
    quaternion.setFromAxisAngle(plane.wobbleAxis, Math.sin(time * 0.05 + plane.phase) * 0.5);
    target.applyQuaternion(quaternion);
    return target.multiplyScalar(plane.altitude + Math.sin(time * 0.4 + plane.phase) * 0.15);
  };

  const circlePoint = (center: Vector3, tangent: Vector3, bitangent: Vector3, reach: number, angle: number, radius: number, target: Vector3) =>
    target
      .copy(center)
      .addScaledVector(tangent, Math.cos(angle) * reach)
      .addScaledVector(bitangent, Math.sin(angle) * reach)
      .normalize()
      .multiplyScalar(radius);

  const update = (time: number) => {
    for (const plane of planes) {
      pathPoint(plane, time, plane.position);
      pathPoint(plane, time + 0.05, ahead);
      plane.forward.subVectors(ahead, plane.position).normalize();
      surfaceBasis(plane.position, plane.forward, plane.model.matrix);
      roll.makeRotationZ(Math.sin(time * 0.3 + plane.phase) * 0.3);
      plane.model.matrix.multiply(roll).scale(plane.model.scale);
      plane.model.matrixWorldNeedsUpdate = true;
      plane.propeller.rotation.z = time * 40;
      if (time - plane.lastPuff > 0.06) {
        plane.lastPuff = time;
        tail.copy(plane.position).addScaledVector(plane.forward, -0.26);
        trail.emit(tail, time, 0.045, 3.2);
      }
    }

    for (const boat of boats) {
      const reach = Math.tan(boat.loop.angularRadius);
      const angle = boat.phase + (boat.speed * time) / reach;
      const bob = Math.sin(time * 2 + boat.phase) * 0.004;
      circlePoint(boat.loop.center, boat.tangent, boat.bitangent, reach, angle, PLANET_RADIUS + bob, position);
      circlePoint(boat.loop.center, boat.tangent, boat.bitangent, reach, angle + Math.sign(boat.speed) * 0.02, PLANET_RADIUS, ahead);
      ahead.sub(position);
      surfaceBasis(position, ahead, boat.model.matrix);
      roll.makeRotationZ(Math.sin(time * 1.7 + boat.phase) * 0.06);
      boat.model.matrix.multiply(roll);
      boat.model.matrixWorldNeedsUpdate = true;
      if (time - boat.lastPuff > 0.12) {
        boat.lastPuff = time;
        tail.copy(ahead).normalize().multiplyScalar(-0.1).add(position);
        trail.emit(tail, time, 0.022, 2.2);
      }
    }

    for (const b of balloons) {
      const angle = b.phase + time * 0.03;
      const altitude = PLANET_RADIUS + Math.max(b.base, 0) + 0.9 + Math.sin(time * 0.5 + b.phase) * 0.12;
      circlePoint(b.center, b.tangent, b.bitangent, 0.05, angle, altitude, position);
      ahead.copy(b.tangent);
      surfaceBasis(position, ahead, b.balloon.matrix);
      b.balloon.matrix.multiply(roll.makeRotationY(time * 0.1));
      b.balloon.matrixWorldNeedsUpdate = true;
    }

    trail.update(time);
  };
  update(0);

  return { group, planes, update };
}

export function createMoon(): { moon: Group; update(time: number): void } {
  const moon = new Group();
  const body = new Mesh(new IcosahedronGeometry(1.4, 3), toonMaterial('#ffe9a8'));
  moon.add(body);
  const craterMaterial = toonMaterial('#e8c878');
  const craters = [
    [0.6, 0.7, 0.4, 0.35],
    [-0.5, 0.2, 0.85, 0.28],
    [0.1, -0.6, 0.8, 0.22],
    [-0.8, -0.4, -0.3, 0.3],
    [0.3, 0.2, -0.95, 0.25],
  ];
  for (const [x, y, z, r] of craters) {
    const crater = new Mesh(new SphereGeometry(r, 12, 8).scale(1, 1, 0.35), craterMaterial);
    const n = new Vector3(x, y, z).normalize();
    crater.position.copy(n).multiplyScalar(1.33);
    crater.lookAt(n.multiplyScalar(3));
    moon.add(crater);
  }
  for (const child of moon.children) child.castShadow = true;
  const axis = new Vector3(0.2, 1, 0.1).normalize();
  const start = new Vector3(34, 6, 0);
  const q = new Quaternion();
  return {
    moon,
    update(time: number) {
      q.setFromAxisAngle(axis, time * 0.02 + 2);
      moon.position.copy(start).applyQuaternion(q);
      moon.rotation.y = time * 0.05;
    },
  };
}
