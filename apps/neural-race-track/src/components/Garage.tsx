import type { Activation } from '../engine/neuralNetwork';
import type { CarConfig, CarStats } from '../types';

type GarageProps = {
  configs: CarConfig[];
  statsById: Map<string, CarStats>;
  leaderboard: CarStats[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (config: CarConfig) => void;
  onRemove: (id: string) => void;
  onRandomize: (id: string) => void;
  onAdd: () => void;
};

const ACTIVATIONS: Activation[] = ['tanh', 'relu', 'sigmoid'];

const hiddenToText = (hidden: number[]) => hidden.join(', ');

const parseHidden = (text: string): number[] =>
  text
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 24)
    .slice(0, 4);

const toDegrees = (radians: number) => Math.round((radians * 180) / Math.PI);
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const describeShape = (stats: CarStats) =>
  [stats.sensorCount + 1, ...stats.hidden, 2].join(' → ');

export function Garage({
  configs,
  statsById,
  leaderboard,
  selectedId,
  onSelect,
  onChange,
  onRemove,
  onRandomize,
  onAdd,
}: GarageProps) {
  const rank = new Map(leaderboard.map((entry, index) => [entry.id, index + 1]));

  return (
    <div className="nrt-garage">
      <div className="nrt-panel">
        <div className="nrt-panel-head">
          <h2>Leaderboard</h2>
          <span className="nrt-hint">best distance along the track</span>
        </div>
        <ol className="nrt-board">
          {leaderboard.map((entry) => (
            <li key={entry.id} className={entry.id === selectedId ? 'selected' : ''}>
              <button type="button" onClick={() => onSelect(entry.id)}>
                <span className="nrt-dot" style={{ background: entry.color }} />
                <span className="nrt-board-name">{entry.name}</span>
                <span className={`nrt-status ${entry.alive ? 'alive' : 'dead'}`}>
                  {entry.alive ? 'driving' : 'crashed'}
                </span>
                <span className="nrt-board-metric">{Math.round(entry.bestDistance)}</span>
              </button>
            </li>
          ))}
          {leaderboard.length === 0 && <li className="nrt-empty">warming up…</li>}
        </ol>
      </div>

      <div className="nrt-panel">
        <div className="nrt-panel-head">
          <h2>Garage</h2>
          <button type="button" className="nrt-btn small" onClick={onAdd} disabled={configs.length >= 8}>
            + Add car
          </button>
        </div>

        <div className="nrt-cars">
          {configs.map((config) => {
            const stats = statsById.get(config.id);
            const selected = config.id === selectedId;
            return (
              <div key={config.id} className={`nrt-car ${selected ? 'open' : ''}`}>
                <button type="button" className="nrt-car-head" onClick={() => onSelect(config.id)}>
                  <span className="nrt-dot" style={{ background: config.color }} />
                  <span className="nrt-car-name">{config.name}</span>
                  {stats && <span className="nrt-car-rank">#{rank.get(config.id) ?? '–'}</span>}
                  {stats && (
                    <span className="nrt-car-facts">
                      gen {stats.generation} · {stats.parameters}w · {stats.laps} laps
                    </span>
                  )}
                </button>

                {selected && (
                  <div className="nrt-editor">
                    <div className="nrt-field-row">
                      <label className="nrt-field">
                        Name
                        <input
                          type="text"
                          value={config.name}
                          onChange={(event) => onChange({ ...config, name: event.target.value })}
                        />
                      </label>
                      <label className="nrt-field color">
                        Color
                        <input
                          type="color"
                          value={config.color}
                          onChange={(event) => onChange({ ...config, color: event.target.value })}
                        />
                      </label>
                    </div>

                    <label className="nrt-field">
                      Sensors: {config.sensorCount}
                      <input
                        type="range"
                        min={2}
                        max={9}
                        value={config.sensorCount}
                        onChange={(event) =>
                          onChange({ ...config, sensorCount: Number(event.target.value) })
                        }
                      />
                    </label>

                    <label className="nrt-field">
                      Field of view: {toDegrees(config.sensorSpread)}°
                      <input
                        type="range"
                        min={60}
                        max={260}
                        value={toDegrees(config.sensorSpread)}
                        onChange={(event) =>
                          onChange({ ...config, sensorSpread: toRadians(Number(event.target.value)) })
                        }
                      />
                    </label>

                    <label className="nrt-field">
                      Hidden layers
                      <input
                        type="text"
                        value={hiddenToText(config.hidden)}
                        placeholder="e.g. 8, 6 (blank = none)"
                        onChange={(event) =>
                          onChange({ ...config, hidden: parseHidden(event.target.value) })
                        }
                      />
                    </label>

                    <div className="nrt-field-row">
                      <label className="nrt-field">
                        Activation
                        <select
                          value={config.activation}
                          onChange={(event) =>
                            onChange({ ...config, activation: event.target.value as Activation })
                          }
                        >
                          {ACTIVATIONS.map((activation) => (
                            <option key={activation} value={activation}>
                              {activation}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="nrt-field">
                        Top speed: {config.maxSpeed}
                        <input
                          type="range"
                          min={100}
                          max={260}
                          step={10}
                          value={config.maxSpeed}
                          onChange={(event) =>
                            onChange({ ...config, maxSpeed: Number(event.target.value) })
                          }
                        />
                      </label>
                    </div>

                    {stats && <p className="nrt-shape">network {describeShape(stats)}</p>}

                    <div className="nrt-editor-actions">
                      <button type="button" className="nrt-btn small" onClick={() => onRandomize(config.id)}>
                        Reroll brain
                      </button>
                      <button
                        type="button"
                        className="nrt-btn small danger"
                        onClick={() => onRemove(config.id)}
                        disabled={configs.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
