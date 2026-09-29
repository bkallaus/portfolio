import { useEffect, useRef } from 'react';
import { type Camera, cameraAt } from '../lib/camera';
import { buildCity } from '../lib/city';
import { whenFontsReady } from '../lib/fonts';
import { type Petal, PETAL_VOLUME, recyclePetal, spawnPetal, stepPetal } from '../lib/petals';
import { type Pointer, scrollProgress, type Viewport } from '../lib/parallax';
import { createRng } from '../lib/rng';
import { StreetRenderer } from '../scene/renderer';
import { buildAssets } from '../scene/textures';

type StageProps = {
  reducedMotion: boolean;
  onFrame: (progress: number, camera: Camera) => void;
  onReady: () => void;
};

const COUNTS = { facades: 8, shops: 8, signs: 16, trees: 3 };

const readViewport = (): Viewport => ({ width: window.innerWidth, height: window.innerHeight });

const readProgress = () => scrollProgress(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);

export function Stage({ reducedMotion, onFrame, onReady }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onFrame, onReady });
  callbacks.current = { onFrame, onReady };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let raf = 0;
    let resizeTimer = 0;
    const pointerTarget: Pointer = { x: 0, y: 0 };
    const pointer: Pointer = { x: 0, y: 0 };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion) return;
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const start = async () => {
      await whenFontsReady(['700 40px "Noto Sans JP"', '600 40px "Chakra Petch"'], 2500);
      if (disposed) return;
      const assets = await buildAssets(29, COUNTS);
      if (disposed) return;
      const city = buildCity(7, { textures: COUNTS.facades, shops: COUNTS.shops, signSprites: COUNTS.signs, treeVariants: COUNTS.trees });
      const renderer = new StreetRenderer(canvas, assets, city, reducedMotion ? 0 : 170);
      let viewport = readViewport();
      renderer.resize(viewport, window.devicePixelRatio);

      const rng = createRng(5);
      let progress = readProgress();
      let camera = cameraAt(progress, viewport, pointer);
      const petals: Petal[] = Array.from({ length: reducedMotion ? 140 : 420 }, () => spawnPetal(rng, camera, PETAL_VOLUME, false));

      const onResize = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          viewport = readViewport();
          renderer.resize(viewport, window.devicePixelRatio);
        }, 150);
      };
      window.addEventListener('resize', onResize);

      let last = performance.now();
      let slowFrames = 0;
      const tick = (now: number) => {
        const elapsed = (now - last) / 1000;
        const dt = Math.min(0.05, elapsed);
        last = now;
        slowFrames = elapsed > 1 / 28 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
        if (slowFrames > 45) {
          slowFrames = 0;
          renderer.degrade();
        }
        const target = readProgress();
        progress = reducedMotion ? target : progress + (target - progress) * (1 - Math.exp(-dt * 6));
        const ease = 1 - Math.exp(-dt * 2.5);
        pointer.x += (pointerTarget.x - pointer.x) * ease;
        pointer.y += (pointerTarget.y - pointer.y) * ease;
        camera = cameraAt(progress, viewport, pointer);

        const weather = { time: now / 1000, wind: 0.5 + Math.sin(now / 4200) * 0.4 + pointer.x * 0.4 };
        for (const petal of petals) {
          stepPetal(petal, dt, weather);
          recyclePetal(petal, rng, camera, PETAL_VOLUME);
        }
        renderer.render(camera, petals, dt);
        callbacks.current.onFrame(progress, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame((now) => {
        last = now;
        tick(now);
        callbacks.current.onReady();
      });

      return () => window.removeEventListener('resize', onResize);
    };

    const started = start();
    window.addEventListener('pointermove', onPointer);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', onPointer);
      started.then((stop) => stop?.());
    };
  }, [reducedMotion]);

  return (
    <div className="ns-stage" aria-hidden="true">
      <canvas ref={canvasRef} className="ns-canvas" />
    </div>
  );
}
