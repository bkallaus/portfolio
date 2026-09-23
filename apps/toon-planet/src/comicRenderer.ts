import {
  Color,
  DepthTexture,
  Mesh,
  MeshNormalMaterial,
  OrthographicCamera,
  type PerspectiveCamera,
  PlaneGeometry,
  type Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { GLOW_LAYER } from './planet.ts';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  #include <packing>
  uniform sampler2D tColor;
  uniform sampler2D tNormal;
  uniform sampler2D tDepth;
  uniform vec2 uResolution;
  uniform float uThickness;
  uniform float uNear;
  uniform float uFar;
  uniform float uTime;
  uniform vec3 uInk;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyBottom;
  uniform vec3 uSkyDots;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform mat4 uInverseProjection;
  uniform mat4 uCameraWorld;
  varying vec2 vUv;

  float viewDepth(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    return -perspectiveDepthToViewZ(d, uNear, uFar);
  }

  vec3 viewNormal(vec2 uv) {
    return texture2D(tNormal, uv).xyz * 2.0 - 1.0;
  }

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  vec3 skyColor(vec3 dir) {
    vec2 pixel = gl_FragCoord.xy;
    float grad = clamp(vUv.y * 1.1 - 0.05, 0.0, 1.0);
    vec3 sky = mix(uSkyBottom, uSkyTop, grad);
    vec2 cell = mat2(0.7071, -0.7071, 0.7071, 0.7071) * pixel / (7.0 * uThickness);
    float dotRadius = (1.0 - grad) * 0.32;
    float dots = 1.0 - smoothstep(dotRadius - 0.05, dotRadius, length(fract(cell) - 0.5));
    sky = mix(sky, uSkyDots, dots * 0.55);

    vec3 p = dir * 90.0;
    vec3 cellId = floor(p);
    float h = hash(cellId);
    if (h > 0.9) {
      vec3 starPos = normalize(cellId + 0.5 + (vec3(hash(cellId + 1.3), hash(cellId + 7.1), hash(cellId + 3.7)) - 0.5) * 0.6);
      float d = acos(clamp(dot(dir, starPos), -1.0, 1.0)) * 90.0;
      float twinkle = 0.65 + 0.35 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
      float size = (h > 0.985 ? 0.14 : 0.06) * twinkle;
      float cross4 = 0.0;
      if (h > 0.985) {
        vec3 t1 = normalize(cross(starPos, vec3(0.0, 1.0, 0.0)));
        vec3 t2 = cross(starPos, t1);
        vec2 local = vec2(dot(dir - starPos, t1), dot(dir - starPos, t2)) * 90.0;
        cross4 = (1.0 - smoothstep(0.0, 0.03, min(abs(local.x), abs(local.y)))) * (1.0 - smoothstep(0.0, 0.5 * twinkle, length(local)));
      }
      float star = max(1.0 - smoothstep(size * 0.6, size, d), cross4);
      sky = mix(sky, vec3(1.0, 0.97, 0.8), star);
    }

    float sunDot = dot(dir, uSunDir);
    float sunAngle = acos(clamp(sunDot, -1.0, 1.0));
    vec3 sunRef = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0)));
    vec3 sunRef2 = cross(uSunDir, sunRef);
    float rayAngle = atan(dot(dir, sunRef2), dot(dir, sunRef));
    float rays = step(0.5, fract(rayAngle * 12.0 / 6.2831853 + uTime * 0.02));
    float halo = (1.0 - smoothstep(0.1, 0.24, sunAngle)) * rays * 0.35;
    float disc = 1.0 - smoothstep(0.075, 0.08, sunAngle);
    float rim = (1.0 - smoothstep(0.08, 0.088, sunAngle)) - disc;
    sky = mix(sky, uSunColor, halo);
    sky = mix(sky, uSunColor, disc);
    sky = mix(sky, uInk, rim);
    return sky;
  }

  void main() {
    vec2 texel = uThickness / uResolution;
    float dc = viewDepth(vUv);
    float d1 = viewDepth(vUv + vec2(texel.x, 0.0));
    float d2 = viewDepth(vUv - vec2(texel.x, 0.0));
    float d3 = viewDepth(vUv + vec2(0.0, texel.y));
    float d4 = viewDepth(vUv - vec2(0.0, texel.y));
    float laplace = abs(d1 + d2 + d3 + d4 - 4.0 * dc) / max(dc, 0.001);
    float depthEdge = smoothstep(0.012, 0.03, laplace);
    float silhouette = smoothstep(0.08, 0.2, max(max(abs(d1 - dc), abs(d2 - dc)), max(abs(d3 - dc), abs(d4 - dc))) / max(dc, 0.001));
    depthEdge = max(depthEdge, silhouette);

    vec3 nc = viewNormal(vUv);
    float n1 = dot(nc, viewNormal(vUv + vec2(texel.x, 0.0)));
    float n2 = dot(nc, viewNormal(vUv - vec2(texel.x, 0.0)));
    float n3 = dot(nc, viewNormal(vUv + vec2(0.0, texel.y)));
    float n4 = dot(nc, viewNormal(vUv - vec2(0.0, texel.y)));
    float normalEdge = smoothstep(0.35, 0.6, 1.0 - min(min(n1, n2), min(n3, n4)));

    float edge = clamp(max(depthEdge, normalEdge), 0.0, 1.0);

    vec4 ndc = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec4 viewRay = uInverseProjection * ndc;
    vec3 dir = normalize((uCameraWorld * vec4(viewRay.xyz / viewRay.w, 0.0)).xyz);

    vec4 color = texture2D(tColor, vUv);
    vec3 result = color.rgb + skyColor(dir) * (1.0 - color.a);
    result = mix(result, uInk, edge * 0.92);

    float grain = fract(sin(dot(gl_FragCoord.xy + floor(uTime * 12.0) * 13.7, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    result += grain * 0.025;
    vec2 centered = vUv - 0.5;
    result *= 1.0 - dot(centered, centered) * 0.35;

    gl_FragColor = vec4(result, 1.0);
    #include <colorspace_fragment>
  }
`;

export class ComicRenderer {
  private readonly colorTarget: WebGLRenderTarget;
  private readonly normalTarget: WebGLRenderTarget;
  private readonly normalMaterial = new MeshNormalMaterial();
  private readonly composite: ShaderMaterial;
  private readonly quad: Mesh;
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly size = new Vector2();

  constructor(
    private readonly renderer: WebGLRenderer,
    samples: number,
  ) {
    this.colorTarget = new WebGLRenderTarget(1, 1, { samples, colorSpace: SRGBColorSpace });
    this.normalTarget = new WebGLRenderTarget(1, 1, { depthTexture: new DepthTexture(1, 1) });
    this.composite = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: this.colorTarget.texture },
        tNormal: { value: this.normalTarget.texture },
        tDepth: { value: this.normalTarget.depthTexture },
        uResolution: { value: new Vector2(1, 1) },
        uThickness: { value: 1 },
        uNear: { value: 0.1 },
        uFar: { value: 100 },
        uTime: { value: 0 },
        uInk: { value: new Color('#1a1033') },
        uSkyTop: { value: new Color('#1b1148') },
        uSkyBottom: { value: new Color('#4b2c8f') },
        uSkyDots: { value: new Color('#7b4bd1') },
        uSunColor: { value: new Color('#ffe24a') },
        uSunDir: { value: new Vector3(1, 0, 0) },
        uInverseProjection: { value: null },
        uCameraWorld: { value: null },
      },
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.composite);
    this.quad.frustumCulled = false;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    const w = Math.floor(width * pixelRatio);
    const h = Math.floor(height * pixelRatio);
    this.colorTarget.setSize(w, h);
    this.normalTarget.setSize(w, h);
    this.composite.uniforms.uResolution.value.set(w, h);
    this.composite.uniforms.uThickness.value = Math.max(1, pixelRatio * 1.1);
  }

  render(scene: Scene, camera: PerspectiveCamera, time: number, sunDirection: Vector3): void {
    const renderer = this.renderer;
    renderer.getSize(this.size);
    renderer.setClearColor(0x000000, 0);

    renderer.shadowMap.needsUpdate = true;
    camera.layers.enable(0);
    camera.layers.enable(GLOW_LAYER);
    renderer.setRenderTarget(this.colorTarget);
    renderer.clear();
    renderer.render(scene, camera);

    camera.layers.disable(GLOW_LAYER);
    scene.overrideMaterial = this.normalMaterial;
    renderer.setRenderTarget(this.normalTarget);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;

    const uniforms = this.composite.uniforms;
    uniforms.uNear.value = camera.near;
    uniforms.uFar.value = camera.far;
    uniforms.uTime.value = time;
    uniforms.uSunDir.value.copy(sunDirection);
    uniforms.uInverseProjection.value = camera.projectionMatrixInverse;
    uniforms.uCameraWorld.value = camera.matrixWorld;
    renderer.setRenderTarget(null);
    renderer.render(this.quad, this.quadCamera);
  }
}
