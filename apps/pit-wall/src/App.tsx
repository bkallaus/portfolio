import { useMemo, useState } from 'react';
import { Garage } from './components/Garage';
import { RivalCard } from './components/RivalCard';
import { Standings } from './components/Standings';
import { DEFAULT_LAPS } from './engine/race';
import { paceLine, planRacingLine, profileOf } from './engine/racingLine';
import { PLAYER_ID, createPlayer, createRivals } from './engine/presets';
import { randomSeed } from './engine/rng';
import { type Stats, capabilityOf, spentOn } from './engine/setup';
import { generateTrack } from './engine/track';
import { useRace } from './hooks/useRace';

const SPEEDS = [1, 2, 4];

export default function App() {
  const [seed, setSeed] = useState(() => randomSeed());
  const [stats, setStats] = useState<Stats>(() => createPlayer().stats);
  const [speed, setSpeed] = useState(1);
  const [rivals] = useState(createRivals);

  const track = useMemo(() => generateTrack(seed), [seed]);
  const line = useMemo(() => planRacingLine(track), [track]);

  const capability = useMemo(() => capabilityOf(stats), [stats]);
  const pace = useMemo(() => paceLine(line, capability), [line, capability]);
  const profile = useMemo(() => profileOf(pace, capability.topSpeed), [pace, capability]);

  const setups = useMemo(
    () => [{ ...createPlayer(), stats }, ...rivals],
    [stats, rivals],
  );

  const { canvasRef, view, start, reset } = useRace(track, setups, DEFAULT_LAPS, speed, PLAYER_ID);
  const racing = view.status === 'running';
  const you = view.standings.find((entry) => entry.id === PLAYER_ID);

  const nextTrack = () => {
    setSeed(randomSeed());
  };

  return (
    <div className="app">
      <header className="masthead">
        <h1>Pit Wall</h1>
        <p>
          Every circuit is generated from a seed. You never touch the wheel — you spend a fixed budget on the car,
          then watch whether your setup was the right read of the track.
        </p>
      </header>

      <main className="stage">
        <section className="track-panel">
          <canvas ref={canvasRef} className="track-canvas" aria-label="Race track" />
          <div className="track-strip">
            <span className="pill">{profile.label}</span>
            <span>{Math.round(track.length)}m lap</span>
            <span>{profile.cornerCount} corners</span>
            <span>{Math.round(profile.flatOutShare * 100)}% flat out</span>
            <span>slowest {Math.round(profile.slowestCorner)}</span>
            <span className="track-clock">{view.elapsed.toFixed(1)}s</span>
          </div>
        </section>

        <aside className="rail">
          <section className="panel">
            <div className="panel-header">
              <h2>Race</h2>
              <div className="segmented">
                {SPEEDS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`segment ${speed === option ? 'is-active' : ''}`}
                    onClick={() => setSpeed(option)}
                  >
                    {option}×
                  </button>
                ))}
              </div>
            </div>

            <div className="race-buttons">
              <button type="button" className="button button-primary" onClick={start} disabled={view.status !== 'grid'}>
                {view.status === 'grid' ? 'Start race' : racing ? 'Racing…' : 'Finished'}
              </button>
              <button type="button" className="button" onClick={reset}>
                Reset grid
              </button>
              <button type="button" className="button" onClick={nextTrack}>
                New track
              </button>
            </div>

            <Standings entries={view.standings} highlightId={PLAYER_ID} />

            {view.status === 'finished' && you && (
              <p className={`verdict ${you.position === 1 ? 'is-win' : ''}`}>
                {you.position === 1 ? 'You win.' : `You finished P${you.position}.`} Retune and try the next track.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Your car</h2>
              {racing && <span className="panel-note">locked while racing</span>}
            </div>
            <Garage
              stats={stats}
              spent={spentOn(stats)}
              predictedLap={pace.lapTime}
              locked={racing}
              onChange={setStats}
            />
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Rivals</h2>
            </div>
            <ul className="rivals">
              {rivals.map((rival) => (
                <RivalCard rival={rival} key={rival.id} />
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}
