import { useCallback, useEffect, useRef, useState } from 'react';
import { type Race, type Standing, createRace, standings, startRace, stepRace } from '../engine/race';
import type { CarSetup } from '../engine/setup';
import type { Track } from '../engine/track';
import { drawRace, fitViewport } from '../render/drawRace';

const FIXED_TIMESTEP = 1 / 60;
const SNAPSHOT_INTERVAL = 100;

export type RaceView = {
  standings: Standing[];
  elapsed: number;
  status: Race['status'];
};

const idle: RaceView = { standings: [], elapsed: 0, status: 'grid' };

export function useRace(track: Track, setups: CarSetup[], laps: number, speed: number, highlightId: string) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raceRef = useRef<Race | null>(null);
  const speedRef = useRef(speed);
  const highlightRef = useRef(highlightId);
  const setupsRef = useRef(setups);
  const [view, setView] = useState<RaceView>(idle);

  speedRef.current = speed;
  highlightRef.current = highlightId;
  setupsRef.current = setups;

  const rebuild = useCallback(() => {
    raceRef.current = createRace(track, setupsRef.current, laps);
    setView({ standings: standings(raceRef.current), elapsed: 0, status: 'grid' });
  }, [track, laps]);

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let lastSnapshot = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const race = raceRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      if (!race || !canvas || !context) return;

      const steps = Math.round((delta / FIXED_TIMESTEP) * speedRef.current);
      for (let step = 0; step < steps; step++) stepRace(race, FIXED_TIMESTEP);

      const viewport = fitViewport(race.track, canvas.width, canvas.height);
      drawRace(
        context,
        race,
        viewport,
        canvas.width,
        canvas.height,
        highlightRef.current,
        race.status !== 'running',
      );

      if (now - lastSnapshot > SNAPSHOT_INTERVAL) {
        lastSnapshot = now;
        setView({ standings: standings(race), elapsed: race.elapsed, status: race.status });
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return {
    canvasRef,
    view,
    start: () => {
      if (raceRef.current?.status === 'grid') startRace(raceRef.current);
    },
    reset: rebuild,
  };
}
