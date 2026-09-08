import { useMemo, useState } from 'react';
import { BrainEditor } from './components/BrainEditor';
import { Standings } from './components/Standings';
import { Toolbar } from './components/Toolbar';
import type { CarSpec } from './engine/car';
import { CAR_COLORS, createCarSpec, createPresetCars } from './engine/presets';
import { randomSeed } from './engine/rng';
import { generateTrack } from './engine/track';
import { useRace } from './hooks/useRace';

const MAX_CARS = 6;

export default function App() {
  const [seed, setSeed] = useState(() => randomSeed());
  const [specs, setSpecs] = useState<CarSpec[]>(createPresetCars);
  const [selectedId, setSelectedId] = useState(() => createPresetCars()[0].id);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [evolving, setEvolving] = useState(true);

  const track = useMemo(() => generateTrack(seed), [seed]);
  const evolution = useMemo(() => ({ enabled: evolving, rate: 0.18, amount: 0.32 }), [evolving]);
  const selectedIndex = Math.max(
    0,
    specs.findIndex((spec) => spec.id === selectedId),
  );

  const { canvasRef, snapshot, restart, resetLearning } = useRace(
    track,
    specs,
    evolution,
    running,
    speed,
    selectedIndex,
  );

  const updateSpec = (index: number, next: CarSpec) =>
    setSpecs((current) => current.map((spec, i) => (i === index ? next : spec)));

  const addCar = () =>
    setSpecs((current) => {
      if (current.length >= MAX_CARS) return current;
      const added = createCarSpec(current.length, randomSeed());
      added.color = CAR_COLORS[current.length % CAR_COLORS.length];
      setSelectedId(added.id);
      return [...current, added];
    });

  const removeCar = (index: number) =>
    setSpecs((current) => {
      if (current.length <= 1) return current;
      const remaining = current.filter((_, i) => i !== index);
      setSelectedId(remaining[Math.min(index, remaining.length - 1)].id);
      return remaining;
    });

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-title">
          <h1>Neural Race Track</h1>
          <p>
            Every track is generated from a seed. Every car steers itself with its own small neural network — change
            the wiring and watch which brain learns the circuit fastest.
          </p>
        </div>
      </header>

      <Toolbar
        seed={seed}
        running={running}
        speed={speed}
        evolving={evolving}
        generation={snapshot.generation}
        onNewTrack={() => setSeed(randomSeed())}
        onSeedChange={setSeed}
        onToggleRunning={() => setRunning((current) => !current)}
        onSpeedChange={setSpeed}
        onToggleEvolving={() => setEvolving((current) => !current)}
        onRestart={restart}
        onResetLearning={resetLearning}
      />

      <main className="stage">
        <section className="track-panel">
          <canvas ref={canvasRef} className="track-canvas" aria-label="Race track simulation" />
          <p className="track-caption">
            Lap {Math.round(track.length)}m · run {snapshot.elapsed.toFixed(1)}s · sensor rays shown for{' '}
            {specs[selectedIndex]?.name ?? 'the selected car'}
          </p>
        </section>

        <aside className="rail">
          <section className="panel">
            <div className="panel-header">
              <h2>Grid</h2>
              <button
                type="button"
                className="button button-quiet"
                onClick={addCar}
                disabled={specs.length >= MAX_CARS}
              >
                Add car
              </button>
            </div>
            <Standings entries={snapshot.standings} selectedId={selectedId} onSelect={setSelectedId} />
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Garage</h2>
            </div>
            {specs[selectedIndex] && (
              <BrainEditor
                spec={specs[selectedIndex]}
                canRemove={specs.length > 1}
                onChange={(next) => updateSpec(selectedIndex, next)}
                onRemove={() => removeCar(selectedIndex)}
              />
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}
