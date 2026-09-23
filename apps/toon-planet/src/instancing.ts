import { type BufferGeometry, Color, type ColorRepresentation, InstancedMesh, type Material, Matrix4 } from 'three';

export class InstanceBatch {
  private readonly matrices: Matrix4[] = [];
  private readonly colors: Color[] = [];

  add(matrix: Matrix4, color: ColorRepresentation = '#ffffff'): void {
    this.matrices.push(matrix.clone());
    this.colors.push(new Color(color));
  }

  get size(): number {
    return this.matrices.length;
  }

  build(geometry: BufferGeometry, material: Material, shadows = true): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, Math.max(this.matrices.length, 1));
    mesh.count = this.matrices.length;
    this.matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, this.colors[i]);
    });
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
}

export class DynamicInstances {
  readonly mesh: InstancedMesh;
  private cursor = 0;
  private readonly scratch = new Matrix4();

  constructor(geometry: BufferGeometry, material: Material, capacity: number, shadows = true) {
    this.mesh = new InstancedMesh(geometry, material, capacity);
    this.mesh.castShadow = shadows;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    const white = new Color('#ffffff');
    for (let i = 0; i < capacity; i++) this.mesh.setColorAt(i, white);
  }

  allocate(color: ColorRepresentation = '#ffffff'): number {
    const index = this.cursor++;
    this.mesh.setColorAt(index, new Color(color));
    return index;
  }

  set(index: number, world: Matrix4, local?: Matrix4): void {
    this.mesh.setMatrixAt(index, local ? this.scratch.multiplyMatrices(world, local) : world);
  }

  commit(): void {
    this.mesh.count = this.cursor;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

export function surfaceBasis(position: { x: number; y: number; z: number }, forwardHint: { x: number; y: number; z: number }, target: Matrix4): Matrix4 {
  const ux = position.x;
  const uy = position.y;
  const uz = position.z;
  const ul = Math.hypot(ux, uy, uz);
  const upX = ux / ul;
  const upY = uy / ul;
  const upZ = uz / ul;
  const dot = forwardHint.x * upX + forwardHint.y * upY + forwardHint.z * upZ;
  let fx = forwardHint.x - upX * dot;
  let fy = forwardHint.y - upY * dot;
  let fz = forwardHint.z - upZ * dot;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  const rx = upY * fz - upZ * fy;
  const ry = upZ * fx - upX * fz;
  const rz = upX * fy - upY * fx;
  return target.set(
    rx, upX, fx, position.x,
    ry, upY, fy, position.y,
    rz, upZ, fz, position.z,
    0, 0, 0, 1,
  );
}
