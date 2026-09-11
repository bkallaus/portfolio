import {
  STAT_BLURBS,
  STAT_BUDGET,
  STAT_KEYS,
  STAT_LABELS,
  STAT_MAXIMUM,
  STAT_MINIMUM,
  type Stats,
} from '../engine/setup';

type GarageProps = {
  stats: Stats;
  spent: number;
  predictedLap: number;
  locked: boolean;
  onChange: (stats: Stats) => void;
};

export function Garage({ stats, spent, predictedLap, locked, onChange }: GarageProps) {
  const remaining = STAT_BUDGET - spent;

  const setStat = (key: keyof Stats, value: number) => {
    const headroom = remaining + stats[key];
    const clamped = Math.min(STAT_MAXIMUM, Math.max(STAT_MINIMUM, Math.min(value, headroom)));
    onChange({ ...stats, [key]: clamped });
  };

  return (
    <div className="garage">
      <div className="budget">
        <span className="budget-label">Budget left</span>
        <span className={`budget-value ${remaining === 0 ? 'is-spent' : ''}`}>{remaining}</span>
        <span className="budget-bar">
          <span className="budget-fill" style={{ width: `${(spent / STAT_BUDGET) * 100}%` }} />
        </span>
      </div>

      {STAT_KEYS.map((key) => (
        <label className="stat" key={key}>
          <span className="stat-head">
            <span className="stat-name">{STAT_LABELS[key]}</span>
            <span className="stat-value">{stats[key]}</span>
          </span>
          <input
            className="slider"
            type="range"
            min={STAT_MINIMUM}
            max={STAT_MAXIMUM}
            value={stats[key]}
            disabled={locked}
            onChange={(event) => setStat(key, Number(event.target.value))}
          />
          <span className="stat-blurb">{STAT_BLURBS[key]}</span>
        </label>
      ))}

      <p className="predicted">
        <span>Predicted lap</span>
        <strong>{predictedLap.toFixed(2)}s</strong>
      </p>
    </div>
  );
}
