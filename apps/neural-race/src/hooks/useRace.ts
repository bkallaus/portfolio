import { useEffect, useRef, useState } from 'react';
import type { CarSpec } from '../engine/car';
import {
  type EvolutionSettings,
  type Race,
  type Standing,
  createRace,
  restartRun,
  standings,
  stepRace,
  syncRacers,
} from '../engine/race';
import type { Track } from '../engine/track';
import { drawRace, fitViewport } from '../render/drawRace';

const FIXED_TIMESTEP = 1 / 60;
const SNAPSHOT_INTERVAL = 110;

export type RaceSnapshot = {
  standings: Standing[];
  generation: number;
  elapsed: number;
};

export type RaceControls = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  snapshot: RaceSnapshot;
  restart: () => void;
  resetLearning: () => void;
};

const emptySnapshot: RaceSnapshot = { standings: [], generation: 1, elapsed: 0 };

export function useRace(
  track: Track,
  specs: CarSpec[],
  evolution: EvolutionSettings,
  running: boolean,
  speed: number,
  selectedIndex: number,
): RaceControls {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raceRef = useRef<Race | null>(null);
  const specsRef = useRef(specs);
  const evolutionRef = useRef(evolution);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const selectedRef = useRef(selectedIndex);
  const [snapshot, setSnapshot] = useState<RaceSnapshot>(emptySnapshot);

  specsRef.current = specs;
  runningRef.current = running;
  speedRef.current = speed;
  selectedRef.current = selectedIndex;

  useEffect(() => {
    raceRef.current = createRace(track, specsRef.current, evolutionRef.current, track.seed);
    setSnapshot({ standings: standings(raceRef.current), generation: 1, elapsed: 0 });
  }, [track]);

  useEffect(() => {
    evolutionRef.current = evolution;
    if (raceRef.current) raceRef.current.evolution = evolution;
  }, [evolution]);

  useEffect(() => {
    if (raceRef.current) syncRacers(raceRef.current, specs);
  }, [specs]);

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

      if (runningRef.current) {
        const steps = Math.round((delta / FIXED_TIMESTEP) * speedRef.current);
        for (let step = 0; step < steps; step++) stepRace(race, FIXED_TIMESTEP);
      }

      const view = fitViewport(race.track, canvas.width, canvas.height);
      drawRace(context, race, view, canvas.width, canvas.height, selectedRef.current);

      if (now - lastSnapshot > SNAPSHOT_INTERVAL) {
        lastSnapshot = now;
        setSnapshot({
          standings: standings(race),
          generation: race.generation,
          elapsed: race.elapsed,
        });
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return {
    canvasRef,
    snapshot,
    restart: () => {
      if (raceRef.current) restartRun(raceRef.current, false);
    },
    resetLearning: () => {
      raceRef.current = createRace(track, specsRef.current, evolutionRef.current, track.seed);
    },
  };
}
