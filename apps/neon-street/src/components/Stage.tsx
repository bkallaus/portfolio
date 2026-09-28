import { useEffect, useRef } from 'react';
import { whenFontsReady } from '../lib/fonts';
import { CRANE_TRAVEL, layerOffset, type Pointer, scrollProgress, type Viewport } from '../lib/parallax';
import { BACKDROP, type LayerSpec, STREETSCAPE } from '../scene/layers';
import { paintLayer } from '../scene/paintLayer';
import { PetalField } from '../scene/petalField';
import { createPetalSprites } from '../scene/petalSprites';

type StageProps = {
  reducedMotion: boolean;
  onFrame: (progress: number) => void;
  onReady: () => void;
};

const ALL_LAYERS = [...BACKDROP, ...STREETSCAPE];

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const readViewport = (): Viewport => ({ width: window.innerWidth, height: window.innerHeight });

const needsRepaint = (painted: Viewport | null, next: Viewport) =>
  !painted || painted.width !== next.width || Math.abs(painted.height - next.height) / painted.height > 0.15;

export function Stage({ reducedMotion, onFrame, onReady }: StageProps) {
  const layerRefs = useRef(new Map<string, HTMLCanvasElement>());
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onFrame, onReady });
  callbacks.current = { onFrame, onReady };

  useEffect(() => {
    const back = backRef.current;
    const front = frontRef.current;
    if (!back || !front) return;

    let disposed = false;
    let painted: Viewport | null = null;
    let paintJob = 0;
    const sprites = createPetalSprites();
    const thin = reducedMotion ? 0.35 : 1;
    const backPetals = new PetalField(back, sprites, { count: Math.round(110 * thin), minDepth: 0.28, maxDepth: 0.62, blurFrom: 9, rain: 0, seed: 5 });
    const frontPetals = new PetalField(front, sprites, { count: Math.round(55 * thin), minDepth: 0.75, maxDepth: 1.7, blurFrom: 1.2, rain: reducedMotion ? 0 : 170, seed: 9 });

    const repaint = async () => {
      const viewport = readViewport();
      if (!needsRepaint(painted, viewport)) return;
      const job = ++paintJob;
      painted = viewport;
      const ratio = window.devicePixelRatio || 1;
      backPetals.resize(viewport.width, viewport.height, Math.min(ratio, 2));
      frontPetals.resize(viewport.width, viewport.height, Math.min(ratio, 2));
      await whenFontsReady(['700 40px "Noto Sans JP"', '600 40px "Chakra Petch"'], 2500);
      for (const spec of ALL_LAYERS) {
        if (disposed || job !== paintJob) return;
        const canvas = layerRefs.current.get(spec.id);
        if (canvas) paintLayer(canvas, spec, viewport, ratio);
        await nextFrame();
      }
      if (!disposed && job === paintJob) callbacks.current.onReady();
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(repaint, 180);
    };

    const pointerTarget: Pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion) return;
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const pointer: Pointer = { x: 0, y: 0 };
    let progress = scrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = scrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
      const previous = progress;
      progress = reducedMotion ? target : progress + (target - progress) * (1 - Math.exp(-dt * 7));
      const ease = 1 - Math.exp(-dt * 2.5);
      pointer.x += (pointerTarget.x - pointer.x) * ease;
      pointer.y += (pointerTarget.y - pointer.y) * ease;

      const viewport = painted ?? readViewport();
      for (const spec of ALL_LAYERS) placeLayer(layerRefs.current.get(spec.id), spec, progress, viewport, pointer);

      const weather = {
        time: now / 1000,
        wind: 0.35 + Math.sin(now / 4200) * 0.25 + pointer.x * 0.2,
        cameraShift: (progress - previous) * CRANE_TRAVEL * viewport.height,
      };
      backPetals.step(dt, weather);
      frontPetals.step(dt, weather);
      backPetals.draw();
      frontPetals.draw();
      callbacks.current.onFrame(progress);
      raf = requestAnimationFrame(tick);
    };

    repaint();
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [reducedMotion]);

  const layer = (spec: LayerSpec) => (
    <canvas
      key={spec.id}
      className="ns-layer"
      data-layer={spec.id}
      ref={(node) => {
        if (node) layerRefs.current.set(spec.id, node);
        else layerRefs.current.delete(spec.id);
      }}
    />
  );

  return (
    <div className="ns-stage" aria-hidden="true">
      {BACKDROP.map(layer)}
      <canvas ref={backRef} className="ns-effects" data-layer="petals-back" />
      {STREETSCAPE.map(layer)}
      <canvas ref={frontRef} className="ns-effects" data-layer="petals-front" />
    </div>
  );
}

function placeLayer(canvas: HTMLCanvasElement | undefined, spec: LayerSpec, progress: number, viewport: Viewport, pointer: Pointer): void {
  if (!canvas) return;
  const offset = layerOffset(progress, spec.depth, viewport, pointer);
  canvas.style.transform = `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0)`;
}
