import { useEffect, useMemo, useRef, useState } from 'react';
import { Simulation } from './engine/simulation';
import { render } from './engine/render';
import { randomSeed } from './engine/rng';
import { Garage } from './components/Garage';
import { createDefaultConfigs, spawnConfig } from './carFactory';
import type { CarConfig, CarStats } from './types';

const SPEED_STEPS = [1, 2, 4, 8];

export default function App() {
  const [configs, setConfigs] = useState<CarConfig[]>(() => createDefaultConfigs());
  const [seed, setSeed] = useState<number>(() => randomSeed());
  const [running, setRunning] = useState(true);
  const [evolve, setEvolve] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(() => configs[0]?.id ?? null);
  const [stats, setStats] = useState<CarStats[]>([]);

  const simRef = useRef<Simulation | null>(null);
  if (!simRef.current) simRef.current = new Simulation(seed, configs);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controls = useRef({ running, speed, showSensors, selectedId, evolve });
  controls.current = { running, speed, showSensors, selectedId, evolve };

  useEffect(() => {
    simRef.current?.syncConfigs(configs);
  }, [configs]);

  useEffect(() => {
    simRef.current?.setTrack(seed);
  }, [seed]);

  useEffect(() => {
    const sim = simRef.current;
    if (sim) sim.evolve = evolve;
  }, [evolve]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let previous = performance.now();
    let statsClock = 0;

    const loop = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const state = controls.current;
      if (state.running) sim.advance(delta, state.speed);

      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;
      if (canvas.width !== Math.floor(cssWidth * dpr) || canvas.height !== Math.floor(cssHeight * dpr)) {
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(ctx, sim, {
        width: cssWidth,
        height: cssHeight,
        selectedId: state.selectedId,
        showSensors: state.showSensors,
      });

      statsClock += delta;
      if (statsClock > 0.2) {
        statsClock = 0;
        setStats(sim.cars.map((car) => car.stats()));
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const statsById = useMemo(() => {
    const map = new Map<string, CarStats>();
    for (const entry of stats) map.set(entry.id, entry);
    return map;
  }, [stats]);

  const leaderboard = useMemo(
    () => [...stats].sort((a, b) => b.bestDistance - a.bestDistance),
    [stats],
  );

  const updateConfig = (next: CarConfig) => {
    setConfigs((prev) => prev.map((config) => (config.id === next.id ? next : config)));
  };

  const addCar = () => {
    setConfigs((prev) => {
      if (prev.length >= 8) return prev;
      const created = spawnConfig(prev.length);
      setSelectedId(created.id);
      return [...prev, created];
    });
  };

  const removeCar = (id: string) => {
    setConfigs((prev) => (prev.length <= 1 ? prev : prev.filter((config) => config.id !== id)));
    setSelectedId((current) => (current === id ? null : current));
  };

  const randomizeCar = (id: string) => {
    const car = simRef.current?.cars.find((entry) => entry.config.id === id);
    if (car && simRef.current) {
      car.randomizeBrain();
      car.respawn(simRef.current.track, false);
    }
  };

  const bestLap = Math.max(0, ...stats.map((entry) => entry.laps));

  return (
    <main className="nrt">
      <header className="nrt-header">
        <div>
          <h1>Neural Race Track</h1>
          <p>
            A procedurally generated circuit. Every car drives itself with its own neural network —
            tune each brain and watch which architecture learns the track fastest.
          </p>
        </div>
        <div className="nrt-scoreboard">
          <span className="nrt-metric">
            <strong>{bestLap}</strong>
            laps by the leader
          </span>
          <span className="nrt-metric">
            <strong>#{(seed >>> 0).toString(16).padStart(8, '0')}</strong>
            track seed
          </span>
        </div>
      </header>

      <div className="nrt-body">
        <section className="nrt-stage">
          <canvas ref={canvasRef} className="nrt-canvas" />
          <div className="nrt-toolbar">
            <button type="button" className="nrt-btn primary" onClick={() => setRunning((value) => !value)}>
              {running ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="nrt-btn" onClick={() => simRef.current?.resetAll()}>
              Restart
            </button>
            <button type="button" className="nrt-btn" onClick={() => simRef.current?.randomizeBrains()}>
              Randomize brains
            </button>
            <button type="button" className="nrt-btn" onClick={() => setSeed(randomSeed())}>
              New track
            </button>
            <div className="nrt-speed">
              <span>Speed</span>
              {SPEED_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className={`nrt-chip ${speed === step ? 'active' : ''}`}
                  onClick={() => setSpeed(step)}
                >
                  {step}×
                </button>
              ))}
            </div>
            <label className="nrt-toggle">
              <input type="checkbox" checked={evolve} onChange={(event) => setEvolve(event.target.checked)} />
              Evolve on crash
            </label>
            <label className="nrt-toggle">
              <input
                type="checkbox"
                checked={showSensors}
                onChange={(event) => setShowSensors(event.target.checked)}
              />
              Show sensors
            </label>
          </div>
        </section>

        <aside className="nrt-side">
          <Garage
            configs={configs}
            statsById={statsById}
            leaderboard={leaderboard}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={updateConfig}
            onRemove={removeCar}
            onRandomize={randomizeCar}
            onAdd={addCar}
          />
        </aside>
      </div>
    </main>
  );
}
