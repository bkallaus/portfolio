import {
  type Material,
  type Mesh,
  MeshLambertMaterial,
  type MeshToonMaterial,
  type Object3D,
  type WebGLRenderer,
} from 'three';

export type ShaderFailure = {
  name: string;
  log: string;
};

export function gpuName(renderer: WebGLRenderer): string {
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const name = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return String(name);
}

export function watchShaderFailures(renderer: WebGLRenderer, onFailure: (failure: ShaderFailure) => void): void {
  renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
    const owner = renderer.info.programs?.find((p) => p.program === program);
    const log = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertexShader), gl.getShaderInfoLog(fragmentShader)]
      .filter((entry) => entry?.trim())
      .join('\n')
      .trim();
    onFailure({ name: owner?.name || 'unknown', log: log || 'no log from the driver' });
  };
}

function plainCopy(material: MeshToonMaterial): MeshLambertMaterial {
  return new MeshLambertMaterial({
    color: material.color,
    vertexColors: material.vertexColors,
    transparent: material.transparent,
    opacity: material.opacity,
    emissive: material.emissive,
    emissiveIntensity: material.emissiveIntensity,
  });
}

export function replaceMaterialsNamed(root: Object3D, names: Set<string>): void {
  const replacements = new Map<Material, Material>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const material = mesh.material;
    if (!names.has(material.name)) return;
    let replacement = replacements.get(material);
    if (!replacement) {
      replacement = plainCopy(material as MeshToonMaterial);
      replacements.set(material, replacement);
    }
    mesh.material = replacement;
  });
}

export function showDiagnostic(lines: string[]): void {
  let panel = document.querySelector<HTMLElement>('.diagnostic');
  if (!panel) {
    panel = document.createElement('aside');
    panel.className = 'diagnostic';
    panel.setAttribute('role', 'status');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Hide';
    close.addEventListener('click', () => panel?.remove());
    panel.append(close, document.createElement('pre'));
    document.body.append(panel);
  }
  const pre = panel.querySelector('pre');
  if (pre) pre.textContent = lines.join('\n');
}
