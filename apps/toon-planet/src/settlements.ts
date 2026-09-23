import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  Vector3,
} from 'three';
import { DynamicInstances, InstanceBatch, surfaceBasis } from './instancing.ts';
import { pick, type Random, range } from './noise.ts';
import { PLANET_RADIUS, SETTLEMENT_LEVEL, type Settlement } from './terrain.ts';
import { toonMaterial } from './toonMaterial.ts';

type UV = [number, number];

const buildingColors = ['#ff5d73', '#ffd23f', '#3bceac', '#4d9de0', '#b388eb', '#ff8c42', '#f8f4e3', '#7bdff2', '#f15bb5'];
const houseWalls = ['#fff3d6', '#ffe5ec', '#e2f0cb', '#d7f9ff', '#fde2ff'];
const roofColors = ['#e63946', '#ff7b00', '#2a9d8f', '#3a86ff', '#8338ec'];
const carColors = ['#ff006e', '#ffbe0b', '#3a86ff', '#fb5607', '#8ac926', '#ffffff', '#00bbf9', '#9b5de5'];

const ROAD_WIDTH = 0.1;
const LANE_OFFSET = 0.024;

class SurfaceFrame {
  readonly radius = PLANET_RADIUS + SETTLEMENT_LEVEL;
  private readonly a = new Vector3();
  private readonly b = new Vector3();

  constructor(readonly site: Settlement) {}

  get extent(): number {
    return Math.tan(this.site.angularRadius) * PLANET_RADIUS;
  }

  point(u: number, v: number, lift: number, target = new Vector3()): Vector3 {
    const { center, tangent, bitangent } = this.site;
    return target
      .copy(center)
      .multiplyScalar(PLANET_RADIUS)
      .addScaledVector(tangent, u)
      .addScaledVector(bitangent, v)
      .normalize()
      .multiplyScalar(this.radius + lift);
  }

  basis(u: number, v: number, du: number, dv: number, lift: number, target: Matrix4): Matrix4 {
    this.point(u, v, lift, this.a);
    this.point(u + du * 0.01, v + dv * 0.01, lift, this.b).sub(this.a);
    return surfaceBasis(this.a, this.b, target);
  }
}

class RibbonBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly indices: number[] = [];
  private readonly left = new Vector3();
  private readonly right = new Vector3();

  constructor(private readonly frame: SurfaceFrame) {}

  add(points: UV[], width: number, lift: number, closed = false): void {
    const count = points.length;
    const start = this.positions.length / 3;
    for (let i = 0; i < count; i++) {
      const prev = points[closed ? (i - 1 + count) % count : Math.max(i - 1, 0)];
      const next = points[closed ? (i + 1) % count : Math.min(i + 1, count - 1)];
      let du = next[0] - prev[0];
      let dv = next[1] - prev[1];
      const length = Math.hypot(du, dv) || 1;
      du /= length;
      dv /= length;
      const [u, v] = points[i];
      const half = width / 2;
      this.frame.point(u + dv * half, v - du * half, lift, this.right);
      this.frame.point(u - dv * half, v + du * half, lift, this.left);
      this.positions.push(this.left.x, this.left.y, this.left.z, this.right.x, this.right.y, this.right.z);
      const up = this.left.clone().add(this.right).normalize();
      this.normals.push(up.x, up.y, up.z, up.x, up.y, up.z);
    }
    const segments = closed ? count : count - 1;
    for (let i = 0; i < segments; i++) {
      const a = start + i * 2;
      const b = start + ((i + 1) % count) * 2;
      this.indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setIndex(this.indices);
    return geometry;
  }
}

function line(from: UV, to: UV, step: number): UV[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const segments = Math.max(1, Math.ceil(length / step));
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as UV;
  });
}

function circle(radius: number, segments: number): UV[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [Math.cos(a) * radius, Math.sin(a) * radius] as UV;
  });
}

class LoopPath {
  private readonly cumulative: number[] = [0];
  readonly length: number;

  constructor(private readonly points: UV[]) {
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      this.cumulative.push(this.cumulative[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    this.length = this.cumulative[this.cumulative.length - 1];
  }

  sample(distance: number): UV {
    const d = ((distance % this.length) + this.length) % this.length;
    let i = 0;
    while (this.cumulative[i + 1] < d) i++;
    const a = this.points[i];
    const b = this.points[(i + 1) % this.points.length];
    const t = (d - this.cumulative[i]) / (this.cumulative[i + 1] - this.cumulative[i] || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
}

export type Car = {
  position: Vector3;
  forward: Vector3;
};

type CarState = Car & {
  frame: SurfaceFrame;
  path: LoopPath;
  distance: number;
  speed: number;
  body: number;
  cabin: number;
  wheels: number[];
  lights: number;
};

export type Settlements = {
  group: Group;
  cars: Car[];
  parkSpots: Vector3[];
  update(dt: number): void;
};

const unitBox = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const pyramid = new ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
const pole = new CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0);

export function createSettlements(city: Settlement, town: Settlement, random: Random): Settlements {
  const group = new Group();
  const cityFrame = new SurfaceFrame(city);
  const townFrame = new SurfaceFrame(town);

  const roads = new RibbonBuilder(cityFrame);
  const townRoads = new RibbonBuilder(townFrame);
  const dashes = new RibbonBuilder(cityFrame);
  const townDashes = new RibbonBuilder(townFrame);

  const towers = new InstanceBatch();
  const roofs = new InstanceBatch();
  const props = new InstanceBatch();
  const parkSpots: Vector3[] = [];
  const carPaths: { frame: SurfaceFrame; path: LoopPath; fast: boolean }[] = [];

  const matrix = new Matrix4();
  const scale = new Matrix4();

  const placeBox = (
    frame: SurfaceFrame,
    batch: InstanceBatch,
    u: number,
    v: number,
    size: [number, number, number],
    lift: number,
    color: string,
    yaw = 0,
  ) => {
    frame.basis(u, v, Math.sin(yaw), Math.cos(yaw), lift, matrix);
    matrix.multiply(scale.makeScale(size[0], size[1], size[2]));
    batch.add(matrix, color);
  };

  const layOutGrid = (
    frame: SurfaceFrame,
    ribbons: RibbonBuilder,
    stripes: RibbonBuilder,
    spacing: number,
    fillBlock: (u: number, v: number, half: number, closeness: number) => void,
  ) => {
    const n = Math.floor((frame.extent * 0.86) / spacing);
    const reach = n * spacing;
    for (let i = -n; i <= n; i++) {
      const c = i * spacing;
      const span = Math.sqrt(Math.max(reach * reach - c * c, 0));
      if (span < spacing * 0.5) continue;
      for (const street of [line([c, -span], [c, span], 0.08), line([-span, c], [span, c], 0.08)]) {
        ribbons.add(street, ROAD_WIDTH, 0.004);
      }
      for (let d = -span + 0.08; d < span - 0.08; d += 0.14) {
        stripes.add([[c, d], [c, d + 0.06]], 0.008, 0.006);
        stripes.add([[d, c], [d + 0.06, c]], 0.008, 0.006);
      }
    }
    const ring = circle(reach + 0.02, Math.max(48, Math.round(reach * 40)));
    ribbons.add(ring, ROAD_WIDTH * 1.3, 0.0045, true);
    carPaths.push({ frame, path: new LoopPath(ring), fast: true });
    carPaths.push({ frame, path: new LoopPath([...ring].reverse()), fast: true });

    for (let i = -n; i < n; i++) {
      for (let j = -n; j < n; j++) {
        const u = (i + 0.5) * spacing;
        const v = (j + 0.5) * spacing;
        const corner = Math.hypot(Math.abs(u) + spacing / 2, Math.abs(v) + spacing / 2);
        if (corner > reach + 0.02) continue;
        fillBlock(u, v, spacing / 2 - ROAD_WIDTH / 2 - 0.025, 1 - Math.hypot(u, v) / reach);
      }
    }

    const loops: UV[][] = [];
    for (let attempt = 0; attempt < 200 && loops.length < n * 4; attempt++) {
      const i0 = Math.floor(range(random, -n, n));
      const j0 = Math.floor(range(random, -n, n));
      const i1 = i0 + 1 + Math.floor(random() * 3);
      const j1 = j0 + 1 + Math.floor(random() * 3);
      const corners: UV[] = [
        [i0 * spacing, j0 * spacing],
        [i1 * spacing, j0 * spacing],
        [i1 * spacing, j1 * spacing],
        [i0 * spacing, j1 * spacing],
      ];
      if (corners.some(([u, v]) => Math.hypot(u, v) > reach - 0.01)) continue;
      const loop = corners.flatMap((c, k) => line(c, corners[(k + 1) % 4], 0.1).slice(0, -1));
      loops.push(random() < 0.5 ? loop : loop.reverse());
    }
    for (const loop of loops) carPaths.push({ frame, path: new LoopPath(loop), fast: false });
  };

  layOutGrid(cityFrame, roads, dashes, 0.52, (u, v, half, closeness) => {
    const roll = random();
    if (roll < 0.14) {
      placeBox(cityFrame, props, u, v, [half * 2, 0.004, half * 2], 0.001, '#62d26f');
      for (let k = 0; k < 5; k++) {
        parkSpots.push(cityFrame.point(u + range(random, -half, half) * 0.8, v + range(random, -half, half) * 0.8, 0));
      }
      return;
    }
    placeBox(cityFrame, props, u, v, [half * 2 + 0.03, 0.006, half * 2 + 0.03], 0.001, '#cfc6d8');
    const tall = 0.14 + closeness ** 2 * 1.25;
    const lots: [number, number, number][] =
      roll < 0.55
        ? [[u, v, half * 1.7]]
        : [
            [u - half / 2, v - half / 2, half * 0.8],
            [u + half / 2, v - half / 2, half * 0.8],
            [u - half / 2, v + half / 2, half * 0.8],
            [u + half / 2, v + half / 2, half * 0.8],
          ];
    for (const [lu, lv, size] of lots) {
      const height = tall * range(random, 0.45, 1.15) * (lots.length > 1 ? 0.7 : 1) + 0.06;
      const color = pick(random, buildingColors);
      const width = size * range(random, 0.8, 1);
      const depth = size * range(random, 0.8, 1);
      placeBox(cityFrame, towers, lu, lv, [width, height, depth], 0, color);
      if (height > 0.45 && random() < 0.55) {
        const top = height * range(random, 0.18, 0.35);
        placeBox(cityFrame, towers, lu, lv, [width * 0.65, top, depth * 0.65], height, color);
        if (random() < 0.6) {
          placeBox(cityFrame, props, lu, lv, [0.008, 0.16, 0.008], height + top, '#ff3b3b');
        }
      } else if (random() < 0.6) {
        placeBox(cityFrame, props, lu + width * 0.2, lv, [width * 0.3, 0.025, depth * 0.3], height, '#9aa0b5');
      }
    }
  });

  layOutGrid(townFrame, townRoads, townDashes, 0.42, (u, v, half) => {
    if (random() < 0.2) {
      for (let k = 0; k < 4; k++) {
        parkSpots.push(townFrame.point(u + range(random, -half, half) * 0.8, v + range(random, -half, half) * 0.8, 0));
      }
      return;
    }
    for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (random() < 0.15) continue;
      const lu = u + (du * half) / 2;
      const lv = v + (dv * half) / 2;
      const w = half * range(random, 0.6, 0.8);
      const h = range(random, 0.07, 0.11);
      const yaw = random() < 0.5 ? 0 : Math.PI / 2;
      placeBox(townFrame, towers, lu, lv, [w, h, w * 1.2], 0, pick(random, houseWalls), yaw);
      placeBox(townFrame, roofs, lu, lv, [w * 1.25, h * 0.8, w * 1.45], h, pick(random, roofColors), yaw);
    }
  });

  const roadMaterial = toonMaterial('#3d4150');
  const dashMaterial = toonMaterial('#ffe066');
  for (const geometry of [roads.build(), townRoads.build()]) {
    const mesh = new Mesh(geometry, roadMaterial);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const geometry of [dashes.build(), townDashes.build()]) {
    const mesh = new Mesh(geometry, dashMaterial);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  group.add(towers.build(unitBox, toonMaterial('#ffffff', { windows: true })));
  group.add(roofs.build(pyramid, toonMaterial('#ffffff')));
  group.add(props.build(unitBox, toonMaterial('#ffffff')));

  const carBodies = new DynamicInstances(unitBox, toonMaterial('#ffffff'), carPaths.length * 2);
  const carCabins = new DynamicInstances(unitBox, toonMaterial('#ffffff'), carPaths.length * 2);
  const carWheels = new DynamicInstances(pole, toonMaterial('#222222'), carPaths.length * 8);
  const carLights = new DynamicInstances(unitBox, toonMaterial('#fff6a0', { emissive: '#fff28a', emissiveIntensity: 0.6 }), carPaths.length * 2);
  group.add(carBodies.mesh, carCabins.mesh, carWheels.mesh, carLights.mesh);

  const cars: CarState[] = [];
  for (const { frame, path, fast } of carPaths) {
    const perPath = fast ? 3 : 1;
    for (let k = 0; k < perPath; k++) {
      cars.push({
        frame,
        path,
        distance: random() * path.length,
        speed: fast ? range(random, 0.42, 0.55) : range(random, 0.2, 0.32),
        position: new Vector3(),
        forward: new Vector3(),
        body: carBodies.allocate(pick(random, carColors)),
        cabin: carCabins.allocate('#bfefff'),
        wheels: [0, 1, 2, 3].map(() => carWheels.allocate()),
        lights: carLights.allocate(),
      });
    }
  }

  const bodyLocal = new Matrix4().makeScale(0.042, 0.018, 0.086).premultiply(new Matrix4().makeTranslation(0, 0.008, 0));
  const cabinLocal = new Matrix4().makeScale(0.036, 0.016, 0.042).premultiply(new Matrix4().makeTranslation(0, 0.026, -0.006));
  const lightsLocal = new Matrix4().makeScale(0.034, 0.006, 0.004).premultiply(new Matrix4().makeTranslation(0, 0.016, 0.043));
  const wheelLocals = [
    [-0.021, 0.027],
    [0.021, 0.027],
    [-0.021, -0.027],
    [0.021, -0.027],
  ].map(([x, z]) =>
    new Matrix4()
      .makeScale(0.018, 0.008, 0.018)
      .premultiply(new Matrix4().makeTranslation(0, -0.004, 0))
      .premultiply(new Matrix4().makeRotationZ(Math.PI / 2))
      .premultiply(new Matrix4().makeTranslation(x, 0.009, z)),
  );
  const world = new Matrix4();
  const ahead = new Vector3();

  const update = (dt: number) => {
    for (const car of cars) {
      car.distance += car.speed * dt;
      const [u0, v0] = car.path.sample(car.distance - 0.04);
      const [u1, v1] = car.path.sample(car.distance + 0.04);
      let du = u1 - u0;
      let dv = v1 - v0;
      const length = Math.hypot(du, dv) || 1;
      du /= length;
      dv /= length;
      const [u, v] = car.path.sample(car.distance);
      const lu = u + dv * LANE_OFFSET;
      const lv = v - du * LANE_OFFSET;
      car.frame.point(lu, lv, 0.004, car.position);
      car.frame.point(lu + du * 0.01, lv + dv * 0.01, 0.004, ahead);
      car.forward.subVectors(ahead, car.position).normalize();
      surfaceBasis(car.position, car.forward, world);
      carBodies.set(car.body, world, bodyLocal);
      carCabins.set(car.cabin, world, cabinLocal);
      carLights.set(car.lights, world, lightsLocal);
      car.wheels.forEach((w, i) => {
        carWheels.set(w, world, wheelLocals[i]);
      });
    }
    carBodies.commit();
    carCabins.commit();
    carWheels.commit();
    carLights.commit();
  };
  update(0);

  return { group, cars, parkSpots, update };
}
