import {
  DirectionalLight,
  HemisphereLight,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CameraRig } from './cameraRig.ts';
import { ComicRenderer } from './comicRenderer.ts';
import { gpuName, replaceMaterialsNamed, type ShaderFailure, showDiagnostic, watchShaderFailures } from './diagnostics.ts';
import { createClouds, createTrees, createWindmills } from './nature.ts';
import { createRandom } from './noise.ts';
import { createPlanet } from './planet.ts';
import { chooseQuality, isConstrainedDevice } from './quality.ts';
import { createSettlements } from './settlements.ts';
import { PLANET_RADIUS, SETTLEMENT_LEVEL, Terrain } from './terrain.ts';
import { sharedUniforms } from './toonMaterial.ts';
import { createMoon, createVehicles } from './vehicles.ts';
import './style.css';

const SUN_SPEED = 0.022;

function findHighestPeak(terrain: Terrain): Vector3 {
  const best = new Vector3(0, 1, 0);
  let bestHeight = -Infinity;
  const samples = 12000;
  const direction = new Vector3();
  for (let i = 0; i < samples; i++) {
    const y = 1 - ((i + 0.5) / samples) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    direction.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const height = terrain.heightAtDirection(direction);
    if (height > bestHeight) {
      bestHeight = height;
      best.copy(direction);
    }
  }
  return best.multiplyScalar(PLANET_RADIUS + bestHeight);
}

function buildWorld(canvasHost: HTMLElement) {
  const constrained = isConstrainedDevice();
  const renderer = new WebGLRenderer({ antialias: false, powerPreference: constrained ? 'default' : 'high-performance' });
  const quality = chooseQuality(renderer, constrained);
  const pixelRatio = quality.pixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  canvasHost.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    showFailure('The graphics chip ran out of steam. Reload to try again!');
  });

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
  const comic = new ComicRenderer(renderer, quality.samples);

  const failures: ShaderFailure[] = [];
  const failedToonMaterials = new Set<string>();
  let pendingFallback = false;
  watchShaderFailures(renderer, (failure) => {
    failures.push(failure);
    if (ComicRenderer.programNames.includes(failure.name)) comic.disableEffects();
    else if (failure.name.startsWith('toon')) {
      failedToonMaterials.add(failure.name);
      pendingFallback = true;
    }
    const gl = renderer.getContext();
    showDiagnostic([
      'Some effects failed on this device and were simplified.',
      `GPU: ${gpuName(renderer)}`,
      `Varyings: ${gl.getParameter(gl.MAX_VARYING_VECTORS)}  Samples: ${quality.samples}  Pixel ratio: ${quality.pixelRatio}`,
      ...failures.map((f) => `[${f.name}] ${f.log.slice(0, 400)}`),
    ]);
  });
  comic.setSize(window.innerWidth, window.innerHeight, pixelRatio);

  const terrain = new Terrain(42);
  const random = createRandom(1234);

  const { group: planet, terrainMesh, oceanMesh } = createPlanet(terrain, quality.terrainDetail);
  scene.add(planet);
  const settlements = createSettlements(terrain.city, terrain.town, random);
  scene.add(settlements.group);
  scene.add(createTrees(terrain, settlements.parkSpots, random));
  const clouds = createClouds(random);
  scene.add(clouds.mesh);
  const windmills = createWindmills(terrain, random);
  scene.add(windmills.group);
  const vehicles = createVehicles(terrain, random);
  scene.add(vehicles.group);
  const moon = createMoon();
  scene.add(moon.moon);

  const sun = new DirectionalLight('#fff1d0', sharedUniforms.uSunIntensity.value);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 75;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  const sunTarget = new Object3D();
  sun.target = sunTarget;
  scene.add(sun, sunTarget);
  scene.add(new HemisphereLight('#b4d2ff', '#6b4ca0', 1.5));

  const city = terrain.city.center;
  const sunStart = Math.atan2(city.z, city.x) + 0.35;
  const sunDirection = new Vector3();

  const rig = new CameraRig(camera, renderer.domElement, terrain);
  camera.position.copy(city).add(new Vector3(0, 0.2, 0)).setLength(rig.planetDistance);

  const peak = findHighestPeak(terrain);
  const citySpot = terrain.city.center.clone().multiplyScalar(PLANET_RADIUS + SETTLEMENT_LEVEL);
  const townSpot = terrain.town.center.clone().multiplyScalar(PLANET_RADIUS + SETTLEMENT_LEVEL);

  let paused = false;
  let simulation = 0;
  let planeIndex = 0;

  const actions: Record<string, () => void> = {
    planet: () => rig.showPlanet(),
    city: () => rig.showPoint(citySpot, 4.2),
    town: () => rig.showPoint(townSpot, 2.2),
    peaks: () => rig.showPoint(peak, 3.2),
    plane: () => {
      const plane = vehicles.planes[planeIndex++ % vehicles.planes.length];
      rig.followObject(() => plane.position, 1.1);
    },
    car: () => {
      const car = settlements.cars[Math.floor(Math.random() * settlements.cars.length)];
      rig.followObject(() => car.position, 0.45);
    },
    pause: () => {
      paused = !paused;
      document.querySelector('[data-action="pause"]')?.setAttribute('aria-pressed', String(paused));
    },
  };

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action]')) {
    button.addEventListener('click', () => actions[button.dataset.action ?? '']?.());
  }

  renderer.domElement.addEventListener(
    'pointerdown',
    () => {
      document.querySelector('.bubble')?.classList.add('dismissed');
    },
    { once: true },
  );

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  renderer.domElement.addEventListener('dblclick', (event) => {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects([terrainMesh, oceanMesh], false);
    if (hit) rig.showPoint(hit.point, 1.4);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    comic.setSize(window.innerWidth, window.innerHeight, pixelRatio);
  });

  const timer = new Timer();
  timer.connect(document);
  sharedUniforms.uDotSize.value = 5 * pixelRatio;

  renderer.setAnimationLoop((timestamp) => {
    try {
      renderFrame(timestamp);
    } catch (error) {
      renderer.setAnimationLoop(null);
      showFailure('Kaboom! Something broke while drawing the planet.', error);
    }
  });

  function renderFrame(timestamp: number) {
    if (pendingFallback) {
      pendingFallback = false;
      replaceMaterialsNamed(scene, failedToonMaterials);
    }
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.1);
    if (!paused) simulation += dt;
    sharedUniforms.uTime.value = simulation;

    const angle = sunStart + simulation * SUN_SPEED;
    sunDirection.set(Math.cos(angle), 0.32, Math.sin(angle)).normalize();
    sun.position.copy(sunDirection).multiplyScalar(40);

    settlements.update(paused ? 0 : dt);
    clouds.update(simulation);
    windmills.update(simulation);
    vehicles.update(simulation, dt);
    moon.update(simulation);
    rig.update(dt);

    comic.render(scene, camera, simulation, sunDirection);
  }
}

function showFailure(message: string, error?: unknown) {
  document.body.classList.remove('ready');
  const loading = document.querySelector('.loading');
  if (!loading) return;
  loading.textContent = message;
  if (error) {
    const detail = document.createElement('small');
    detail.className = 'failure-detail';
    detail.textContent = error instanceof Error ? error.message : String(error);
    loading.append(detail);
  }
}

const host = document.getElementById('stage');
if (host) {
  requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        buildWorld(host);
      } catch (error) {
        showFailure('Kaboom! This browser can’t draw 3D (WebGL) right now.', error);
        return;
      }
      document.body.classList.add('ready');
    }, 30);
  });
}
