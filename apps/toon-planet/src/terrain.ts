import { Vector3 } from 'three';
import { createNoise3, createRandom, fractal, type Noise3, smoothstep } from './noise.ts';

export const PLANET_RADIUS = 10;
export const SETTLEMENT_LEVEL = 0.16;

export type Settlement = {
  center: Vector3;
  tangent: Vector3;
  bitangent: Vector3;
  angularRadius: number;
};

export type OceanLoop = {
  center: Vector3;
  angularRadius: number;
};

export class Terrain {
  readonly settlements: Settlement[] = [];
  private readonly continentNoise: Noise3;
  private readonly ridgeNoise: Noise3;
  private readonly detailNoise: Noise3;

  constructor(seed: number) {
    const random = createRandom(seed);
    this.continentNoise = createNoise3(random);
    this.ridgeNoise = createNoise3(random);
    this.detailNoise = createNoise3(random);
    const city = this.findSettlementSite(0.3, []);
    this.settlements.push(city);
    this.settlements.push(this.findSettlementSite(0.14, [city.center]));
  }

  get city(): Settlement {
    return this.settlements[0];
  }

  get town(): Settlement {
    return this.settlements[1];
  }

  continentAt(x: number, y: number, z: number): number {
    return fractal(this.continentNoise, x * 1.05, y * 1.05, z * 1.05, 5) + 0.04;
  }

  mountainAt(x: number, y: number, z: number): number {
    const mask = smoothstep(0.14, 0.34, this.continentAt(x, y, z));
    const ridge = (1 - Math.abs(this.ridgeNoise(x * 2.3, y * 2.3, z * 2.3))) ** 4;
    const crags = (1 - Math.abs(this.detailNoise(x * 6.2, y * 6.2, z * 6.2))) ** 3;
    return mask * (ridge * 1.15 + ridge * crags * 0.45);
  }

  rawHeight(x: number, y: number, z: number): number {
    const continent = this.continentAt(x, y, z);
    if (continent < 0) return Math.max(continent * 2.2, -0.7);
    const rolling = this.detailNoise(x * 3.1, y * 3.1, z * 3.1) * 0.05;
    return smoothstep(0, 0.2, continent) * 0.28 + continent * 0.25 + rolling + this.mountainAt(x, y, z);
  }

  settlementWeight(x: number, y: number, z: number): number {
    let weight = 0;
    for (const site of this.settlements) {
      const c = site.center;
      const angle = Math.acos(Math.min(1, Math.max(-1, x * c.x + y * c.y + z * c.z)));
      weight = Math.max(weight, 1 - smoothstep(site.angularRadius * 1.05, site.angularRadius * 1.6, angle));
    }
    return weight;
  }

  heightAt(x: number, y: number, z: number): number {
    const raw = this.rawHeight(x, y, z);
    const weight = this.settlementWeight(x, y, z);
    return raw + (SETTLEMENT_LEVEL - raw) * weight;
  }

  heightAtDirection(direction: Vector3): number {
    return this.heightAt(direction.x, direction.y, direction.z);
  }

  surfaceRadius(direction: Vector3): number {
    return PLANET_RADIUS + Math.max(this.heightAtDirection(direction), 0);
  }

  findOceanLoops(count: number, seed: number): OceanLoop[] {
    const random = createRandom(seed);
    const loops: OceanLoop[] = [];
    const probe = new Vector3();
    for (let attempt = 0; attempt < 4000 && loops.length < count; attempt++) {
      const center = randomDirection(random);
      const angularRadius = 0.06 + random() * 0.1;
      const frame = tangentFrame(center);
      let allWater = true;
      for (let k = 0; k < 20 && allWater; k++) {
        const a = (k / 20) * Math.PI * 2;
        probe
          .copy(center)
          .addScaledVector(frame.tangent, Math.cos(a) * Math.tan(angularRadius))
          .addScaledVector(frame.bitangent, Math.sin(a) * Math.tan(angularRadius))
          .normalize();
        if (this.heightAtDirection(probe) > -0.06) allWater = false;
      }
      if (!allWater) continue;
      if (loops.some((l) => l.center.angleTo(center) < 0.45)) continue;
      loops.push({ center, angularRadius });
    }
    return loops;
  }

  findLandSpots(count: number, seed: number, accept: (direction: Vector3, height: number) => boolean): Vector3[] {
    const random = createRandom(seed);
    const spots: Vector3[] = [];
    for (let attempt = 0; attempt < count * 60 && spots.length < count; attempt++) {
      const direction = randomDirection(random);
      const height = this.heightAtDirection(direction);
      if (accept(direction, height)) spots.push(direction);
    }
    return spots;
  }

  private findSettlementSite(angularRadius: number, avoid: Vector3[]): Settlement {
    const samples = 3000;
    const probe = new Vector3();
    let best: Vector3 | null = null;
    let bestScore = -Infinity;
    for (let i = 0; i < samples; i++) {
      const direction = fibonacciDirection(i, samples);
      if (avoid.some((a) => a.angleTo(direction) < 1.3)) continue;
      const continent = this.continentAt(direction.x, direction.y, direction.z);
      if (continent < 0.08) continue;
      const frame = tangentFrame(direction);
      let minimum = Infinity;
      let mountains = this.mountainAt(direction.x, direction.y, direction.z);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const reach = Math.tan(angularRadius * 1.7);
        probe
          .copy(direction)
          .addScaledVector(frame.tangent, Math.cos(a) * reach)
          .addScaledVector(frame.bitangent, Math.sin(a) * reach)
          .normalize();
        minimum = Math.min(minimum, this.rawHeight(probe.x, probe.y, probe.z));
        mountains += this.mountainAt(probe.x, probe.y, probe.z);
      }
      if (minimum < 0.03) continue;
      const nearbyPeaks = this.nearbyPeakScore(direction, angularRadius);
      const score = -mountains * 2 + nearbyPeaks + Math.min(minimum, 0.3);
      if (score > bestScore) {
        bestScore = score;
        best = direction;
      }
    }
    const center = best ?? new Vector3(0, 1, 0);
    return { center, ...tangentFrame(center), angularRadius };
  }

  private nearbyPeakScore(direction: Vector3, angularRadius: number): number {
    const frame = tangentFrame(direction);
    const probe = new Vector3();
    let peak = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const reach = Math.tan(angularRadius * 2.8);
      probe
        .copy(direction)
        .addScaledVector(frame.tangent, Math.cos(a) * reach)
        .addScaledVector(frame.bitangent, Math.sin(a) * reach)
        .normalize();
      peak = Math.max(peak, this.mountainAt(probe.x, probe.y, probe.z));
    }
    return Math.min(peak, 1) * 0.6;
  }
}

export function tangentFrame(up: Vector3): { tangent: Vector3; bitangent: Vector3 } {
  const helper = Math.abs(up.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const tangent = new Vector3().crossVectors(helper, up).normalize();
  const bitangent = new Vector3().crossVectors(tangent, up).normalize();
  return { tangent, bitangent };
}

export function randomDirection(random: () => number): Vector3 {
  const z = random() * 2 - 1;
  const a = random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return new Vector3(r * Math.cos(a), r * Math.sin(a), z);
}

function fibonacciDirection(i: number, n: number): Vector3 {
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(1 - y * y);
  const a = i * Math.PI * (3 - Math.sqrt(5));
  return new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
}
