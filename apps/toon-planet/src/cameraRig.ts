import { type PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANET_RADIUS, type Terrain } from './terrain.ts';

type Flight = {
  fromUp: Vector3;
  fromTarget: Vector3;
  fromCamera: Vector3;
  toTarget: () => Vector3;
  toCamera: (target: Vector3) => Vector3;
  elapsed: number;
  duration: number;
};

const worldUp = new Vector3(0, 1, 0);

type OrbitInternals = { _quat: Quaternion; _quatInverse: Quaternion };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class CameraRig {
  readonly controls: OrbitControls;
  private flight: Flight | null = null;
  private follow: (() => Vector3) | null = null;
  private readonly quaternion = new Quaternion();
  private readonly offset = new Vector3();
  private readonly scratch = new Vector3();

  constructor(
    private readonly camera: PerspectiveCamera,
    element: HTMLElement,
    private readonly terrain: Terrain,
  ) {
    this.controls = new OrbitControls(camera, element);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.maxDistance = 80;
    this.controls.minDistance = PLANET_RADIUS + 0.8;
    this.controls.zoomSpeed = 1.2;
  }

  get surfaceMode(): boolean {
    return this.controls.target.lengthSq() > 1;
  }

  get planetDistance(): number {
    return this.camera.aspect < 1 ? Math.min(34 / (this.camera.aspect * 1.25), 70) : 34;
  }

  showPlanet(): void {
    this.follow = null;
    const distance = this.planetDistance;
    this.flyTo(
      () => new Vector3(),
      () => this.camera.position.clone().normalize().multiplyScalar(distance),
      1.6,
    );
  }

  showPoint(point: Vector3, distance: number): void {
    this.follow = null;
    const fixed = point.clone();
    this.flyTo(() => fixed, (target) => this.approach(target, distance), 1.8);
  }

  followObject(getter: () => Vector3, distance: number): void {
    this.follow = null;
    this.flyTo(getter, (target) => this.approach(target, distance), 1.8, () => {
      this.follow = getter;
    });
  }

  private onArrive: (() => void) | null = null;

  private flyTo(toTarget: () => Vector3, toCamera: (target: Vector3) => Vector3, duration: number, onArrive?: () => void): void {
    this.flight = {
      fromUp: this.camera.up.clone(),
      fromTarget: this.controls.target.clone(),
      fromCamera: this.camera.position.clone(),
      toTarget,
      toCamera,
      elapsed: 0,
      duration,
    };
    this.onArrive = onArrive ?? null;
    this.controls.enabled = false;
  }

  private approach(target: Vector3, distance: number): Vector3 {
    const up = target.clone().normalize();
    const away = this.scratch.copy(this.camera.position).sub(target);
    away.addScaledVector(up, -away.dot(up));
    if (away.lengthSq() < 1e-6) away.set(1, 0, 0).addScaledVector(up, -up.x);
    away.normalize();
    return target.clone().add(up.multiplyScalar(0.62).add(away.multiplyScalar(0.78)).normalize().multiplyScalar(distance));
  }

  update(dt: number): void {
    if (this.flight) this.updateFlight(dt);
    else if (this.follow) this.trackFollow(this.follow());

    const distance = this.camera.position.distanceTo(this.controls.target);
    if (this.surfaceMode) {
      this.controls.minDistance = 0.12;
      this.controls.maxDistance = 18;
      this.controls.rotateSpeed = 0.7;
      if (!this.flight && distance > 17.5) this.showPlanet();
    } else {
      this.controls.minDistance = PLANET_RADIUS + 0.9;
      this.controls.maxDistance = 80;
      this.controls.rotateSpeed = Math.min(Math.max((distance - PLANET_RADIUS) / 18, 0.05), 1);
    }

    if (!this.flight) this.controls.update(dt);
    this.keepAboveGround();
    this.fitClipPlanes();
  }

  private updateFlight(dt: number): void {
    const flight = this.flight as Flight;
    flight.elapsed += dt;
    const t = Math.min(flight.elapsed / flight.duration, 1);
    const e = ease(t);
    const target = flight.toTarget();
    const destination = flight.toCamera(target);
    this.controls.target.lerpVectors(flight.fromTarget, target, e);
    this.setUp(this.scratch.lerpVectors(flight.fromUp, this.upFor(target), e));
    const fromLength = flight.fromCamera.length();
    const toLength = destination.length();
    this.quaternion.setFromUnitVectors(flight.fromCamera.clone().normalize(), destination.clone().normalize());
    const partial = new Quaternion().slerp(this.quaternion, e);
    this.camera.position
      .copy(flight.fromCamera)
      .normalize()
      .applyQuaternion(partial)
      .multiplyScalar(fromLength + (toLength - fromLength) * e);
    this.camera.lookAt(this.controls.target);
    if (t >= 1) {
      this.flight = null;
      this.controls.enabled = true;
      this.camera.position.copy(destination);
      this.controls.update();
      const arrive = this.onArrive;
      this.onArrive = null;
      arrive?.();
    }
  }

  private upFor(target: Vector3): Vector3 {
    return target.lengthSq() > 1 ? target.clone().normalize() : worldUp.clone();
  }

  private setUp(up: Vector3): void {
    if (up.lengthSq() < 1e-6) return;
    this.camera.up.copy(up).normalize();
    const internals = this.controls as unknown as OrbitInternals;
    internals._quat.setFromUnitVectors(this.camera.up, worldUp);
    internals._quatInverse.copy(internals._quat).invert();
  }

  private trackFollow(next: Vector3): void {
    const target = this.controls.target;
    this.offset.subVectors(this.camera.position, target);
    this.quaternion.setFromUnitVectors(this.scratch.copy(target).normalize(), next.clone().normalize());
    this.offset.applyQuaternion(this.quaternion);
    target.copy(next);
    this.camera.position.copy(next).add(this.offset);
    this.setUp(this.upFor(next));
  }

  private keepAboveGround(): void {
    const position = this.camera.position;
    const floor = this.terrain.surfaceRadius(this.scratch.copy(position).normalize()) + 0.05;
    if (position.length() < floor) position.setLength(floor);
  }

  private fitClipPlanes(): void {
    const position = this.camera.position;
    const altitude = position.length() - this.terrain.surfaceRadius(this.scratch.copy(position).normalize());
    this.camera.near = Math.min(Math.max(altitude * 0.2, 0.01), 2);
    this.camera.far = position.length() + 60;
    this.camera.updateProjectionMatrix();
  }
}
