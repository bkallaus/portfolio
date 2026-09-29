import { between, chance, createRng, type Rng } from './rng';

export const FACADE_X = 9;
export const BACK_X = 26;
export const OUTER_X = 64;
export const SIDEWALK = 2.4;
export const SHOP_HEIGHT = 7.5;
export const CITY_START = -30;
export const CITY_END = 820;

export type Side = -1 | 1;

export type Building = {
  z0: number;
  z1: number;
  height: number;
  texture: number;
  shop: number;
  u: number;
};

export type Row = {
  side: Side;
  x: number;
  outer: number;
  storefronts: boolean;
  buildings: Building[];
};

export type Sign = { side: Side; z: number; y: number; depth: number; sprite: number };

export type Tree = { side: Side; z: number; variant: number };

export type Cable = { z: number; left: number; right: number; sag: number; lanterns: boolean };

export type Bridge = { z0: number; z1: number; bottom: number; top: number };

export type City = {
  front: Row[];
  back: Row[];
  signs: Sign[];
  trees: Tree[];
  cables: Cable[];
  bridges: Bridge[];
};

export type CityOptions = { textures: number; shops: number; signSprites: number; treeVariants: number };

function frontHeight(rng: Rng): number {
  const roll = rng();
  if (roll < 0.55) return between(rng, 12, 36);
  if (roll < 0.88) return between(rng, 36, 78);
  return between(rng, 80, 132);
}

function lineUp(
  rng: Rng,
  options: CityOptions,
  length: () => number,
  height: () => number,
): Building[] {
  const buildings: Building[] = [];
  let z = CITY_START;
  while (z < CITY_END) {
    const z1 = z + length();
    buildings.push({
      z0: z,
      z1,
      height: height(),
      texture: Math.floor(rng() * options.textures),
      shop: Math.floor(rng() * options.shops),
      u: between(rng, 0, 32),
    });
    z = z1;
  }
  return buildings;
}

export function buildCity(seed: number, options: CityOptions): City {
  const rng = createRng(seed);
  const sides: Side[] = [-1, 1];

  const front = sides.map<Row>((side) => ({
    side,
    x: FACADE_X,
    outer: BACK_X,
    storefronts: true,
    buildings: lineUp(rng, options, () => between(rng, 9, 26), () => frontHeight(rng)),
  }));

  const back = sides.map<Row>((side) => ({
    side,
    x: BACK_X,
    outer: OUTER_X,
    storefronts: false,
    buildings: lineUp(rng, options, () => between(rng, 16, 48), () => between(rng, 60, 245)),
  }));

  const signs: Sign[] = [];
  for (const row of front) {
    for (const building of row.buildings) {
      if (building.height < 20) continue;
      const count = chance(rng, 0.35) ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const span = building.z1 - building.z0;
        signs.push({
          side: row.side,
          z: building.z0 + span * between(rng, 0.15, 0.85),
          y: between(rng, SHOP_HEIGHT + 0.5, Math.min(building.height - 9, 34)),
          depth: between(rng, 1.1, 1.8),
          sprite: Math.floor(rng() * options.signSprites),
        });
      }
    }
  }

  const trees: Tree[] = [];
  for (const side of sides) {
    for (let z = between(rng, 2, 10); z < 520; z += between(rng, 15, 26)) {
      trees.push({ side, z, variant: Math.floor(rng() * options.treeVariants) });
    }
  }

  const cables: Cable[] = [];
  for (let z = 6; z < 600; z += between(rng, 9, 22)) {
    const base = between(rng, 8, 24);
    cables.push({ z, left: base + between(rng, -2, 2), right: base + between(rng, -2, 2), sag: between(rng, 0.6, 2.2), lanterns: chance(rng, 0.3) });
  }

  const bridges: Bridge[] = [
    { z0: 40, z1: 45, bottom: 16, top: 20 },
    { z0: 96, z1: 101, bottom: 22, top: 26.5 },
    { z0: 212, z1: 218, bottom: 30, top: 35 },
    { z0: 340, z1: 345, bottom: 12, top: 16 },
  ];

  return { front, back, signs, trees, cables, bridges };
}

export function buildingAt(row: Row, z: number): Building | undefined {
  const list = row.buildings;
  let low = 0;
  let high = list.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const building = list[mid];
    if (z < building.z0) high = mid - 1;
    else if (z >= building.z1) low = mid + 1;
    else return building;
  }
  return undefined;
}
