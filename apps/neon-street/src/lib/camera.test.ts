import { altitudeAt, cameraAt, EYE_HEIGHT, groundDepth, project, ROOFTOP_HEIGHT, wallDepth } from './camera';

const viewport = { width: 1440, height: 900 };

describe('camera path', () => {
  it('starts at rooftop height and ends at eye level further down the street', () => {
    const start = cameraAt(0, viewport);
    const end = cameraAt(1, viewport);
    expect(start.y).toBe(ROOFTOP_HEIGHT);
    expect(end.y).toBeCloseTo(EYE_HEIGHT);
    expect(end.z).toBeGreaterThan(start.z);
    expect(altitudeAt(0.5)).toBeLessThan(altitudeAt(0.2));
  });

  it('keeps the vanishing point in the middle of the frame', () => {
    const camera = cameraAt(0.4, viewport);
    expect(camera.cx).toBe(720);
    expect(camera.cy).toBeGreaterThan(300);
    expect(camera.cy).toBeLessThan(600);
  });

  it('uses a wide lens so facades converge hard', () => {
    const camera = cameraAt(0, viewport);
    const fov = 2 * Math.atan(viewport.width / 2 / camera.focal) * (180 / Math.PI);
    expect(fov).toBeGreaterThan(95);
  });
});

describe('projection', () => {
  const camera = cameraAt(1, viewport);

  it('sends every line parallel to the street to one vanishing point', () => {
    for (const [x, y] of [
      [-9, 0],
      [9, 40],
      [-9, 120],
    ]) {
      const far = project(camera, x, y, camera.z + 1e7);
      expect(far?.x).toBeCloseTo(camera.cx, 1);
      expect(far?.y).toBeCloseTo(camera.cy, 1);
    }
  });

  it('shrinks things with distance', () => {
    const near = project(camera, -9, 10, camera.z + 10);
    const far = project(camera, -9, 10, camera.z + 40);
    expect(near?.scale).toBeGreaterThan(far?.scale ?? 0);
  });

  it('culls points behind the camera', () => {
    expect(project(camera, 0, 0, camera.z - 1)).toBeNull();
  });

  it('inverts projection for the wall and the ground', () => {
    const wallPoint = project(camera, -9, 5, camera.z + 30);
    expect(wallDepth(camera, wallPoint?.x ?? 0, -9)).toBeCloseTo(30);
    const groundPoint = project(camera, 2, 0, camera.z + 25);
    expect(groundDepth(camera, groundPoint?.y ?? 0)).toBeCloseTo(25);
    expect(groundDepth(camera, camera.cy - 10)).toBeNull();
  });
});
