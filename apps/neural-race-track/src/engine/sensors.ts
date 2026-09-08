import type { Track } from './track';
import { fromAngle, raySegmentDistance, type Vec } from './vec';

export type SensorReading = { angle: number; distance: number; hit: Vec };

export const sensorAngles = (count: number, spread: number): number[] => {
  if (count <= 1) return [0];
  const angles: number[] = [];
  for (let i = 0; i < count; i++) {
    angles.push(-spread / 2 + (spread * i) / (count - 1));
  }
  return angles;
};

export const castSensors = (
  origin: Vec,
  heading: number,
  angles: number[],
  track: Track,
  range: number,
): SensorReading[] =>
  angles.map((offset) => {
    const direction = fromAngle(heading + offset);
    let closest = range;
    for (const segment of track.wallSegments) {
      const distance = raySegmentDistance(origin, direction, segment.a, segment.b);
      if (distance !== null && distance < closest) closest = distance;
    }
    return {
      angle: offset,
      distance: closest,
      hit: { x: origin.x + direction.x * closest, y: origin.y + direction.y * closest },
    };
  });
