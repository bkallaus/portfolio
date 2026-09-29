import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage } from './components/Stage';
import type { Camera } from './lib/camera';

const CHAPTERS = [
  {
    index: '01',
    label: 'Skyline',
    jp: '摩天楼',
    title: 'Every line runs to one point.',
    body: 'Scroll to fly down the street. Facades, cables and kerbs all rush toward the same vanishing point, and everything near you moves faster than everything far away.',
  },
  {
    index: '02',
    label: 'Mid-block',
    jp: '雑居ビル',
    title: 'Signage stacked forty floors deep.',
    body: 'Karaoke over pawnshop over noodle bar. The fog swallows the far end of the block, and the blossoms start to drift past the windows.',
  },
  {
    index: '03',
    label: 'Street level',
    jp: '夜桜通り',
    title: 'Yozakura-dōri. The petals never stop here.',
    body: 'Wet asphalt holds every sign twice. Move the cursor and the whole street leans with you.',
  },
] as const;

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function App() {
  const reducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const altitudeRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  const onFrame = useCallback((progress: number, camera: Camera) => {
    if (altitudeRef.current) altitudeRef.current.textContent = camera.y.toFixed(1).padStart(5, '0');
    if (railRef.current) railRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
    if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - progress * 12));
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className="ns-root" data-ready={ready}>
      <Stage reducedMotion={reducedMotion} onFrame={onFrame} onReady={onReady} />
      <div className="ns-grade" aria-hidden="true" />
      <div className="ns-grain" aria-hidden="true" />

      <div className="ns-boot" aria-hidden={ready}>
        <span>Rendering district</span>
        <span className="ns-boot-bar" />
      </div>

      <header className="ns-top">
        <a className="ns-back" href="/">
          ← ben.kallaus.me
        </a>
        <div className="ns-brand">
          <h1>Neon Bloom</h1>
          <p lang="ja">夜桜通り · 第七区</p>
        </div>
      </header>

      <aside className="ns-telemetry" aria-label="Camera telemetry">
        <dl>
          <div>
            <dt>ALT</dt>
            <dd>
              <span ref={altitudeRef}>038.0</span> m
            </dd>
          </div>
          <div>
            <dt>RAIN</dt>
            <dd>{reducedMotion ? 'still' : '71%'}</dd>
          </div>
          <div>
            <dt>BLOOM</dt>
            <dd>full</dd>
          </div>
        </dl>
        <span className="ns-rail" aria-hidden="true">
          <span ref={railRef} />
        </span>
      </aside>

      <p ref={hintRef} className="ns-hint">
        Scroll to descend
      </p>

      <main className="ns-scroll">
        {CHAPTERS.map((chapter) => (
          <section key={chapter.index} className="ns-chapter" aria-labelledby={`chapter-${chapter.index}`}>
            <div className="ns-card">
              <p className="ns-kicker">
                <span>{chapter.index}</span>
                <span>{chapter.label}</span>
                <span lang="ja">{chapter.jp}</span>
              </p>
              <h2 id={`chapter-${chapter.index}`}>{chapter.title}</h2>
              <p>{chapter.body}</p>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
