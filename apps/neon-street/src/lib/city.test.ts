import { EYE_HEIGHT, ROOFTOP_HEIGHT, START_Z, END_Z, cameraAt } from './camera';
import { buildCity, buildingAt, CITY_END, CITY_START, FACADE_X, SHOP_HEIGHT } from './city';

const options = { textures: 8, shops: 8, signSprites: 16, treeVariants: 3 };
const city = buildCity(7, options);

describe('city layout', () => {
  it('is deterministic for a seed', () => {
    expect(buildCity(7, options)).toEqual(city);
  });

  it('lines both sides of the street with an unbroken wall of buildings', () => {
    for (const row of [...city.front, ...city.back]) {
      expect(row.buildings[0].z0).toBe(CITY_START);
      expect(row.buildings.at(-1)?.z1).toBeGreaterThanOrEqual(CITY_END);
      for (let i = 1; i < row.buildings.length; i++) {
        expect(row.buildings[i].z0).toBe(row.buildings[i - 1].z1);
      }
    }
  });

  it('finds the building at any depth along the street', () => {
    const row = city.front[0];
    for (const z of [CITY_START, 0, 33.3, 400, CITY_END - 1]) {
      const building = buildingAt(row, z);
      expect(building).toBeDefined();
      expect(z).toBeGreaterThanOrEqual(building?.z0 ?? Number.NaN);
      expect(z).toBeLessThan(building?.z1 ?? Number.NaN);
    }
    expect(buildingAt(row, CITY_START - 1)).toBeUndefined();
  });

  it('hangs signs on buildings tall enough to hold them, above the shopfronts', () => {
    for (const sign of city.signs) {
      const row = city.front.find((candidate) => candidate.side === sign.side);
      const building = row && buildingAt(row, sign.z);
      expect(building).toBeDefined();
      expect(sign.y).toBeGreaterThan(SHOP_HEIGHT);
      expect(sign.y).toBeLessThan(building?.height ?? 0);
      expect(sign.depth).toBeLessThan(FACADE_X);
    }
  });

  it('keeps every bridge clear of the camera path', () => {
    for (const bridge of city.bridges) {
      if (bridge.z0 < START_Z || bridge.z0 > END_Z) continue;
      const progress = (bridge.z0 - START_Z) / (END_Z - START_Z);
      const height = cameraAt(progress, { width: 1, height: 1 }).y;
      expect(height < bridge.bottom - 2 || height > bridge.top + 2).toBe(true);
    }
    expect(EYE_HEIGHT).toBeLessThan(ROOFTOP_HEIGHT);
  });
});
