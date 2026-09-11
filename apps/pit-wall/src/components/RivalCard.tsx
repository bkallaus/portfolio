import { STAT_KEYS, STAT_LABELS, STAT_MAXIMUM } from '../engine/setup';
import type { CarSetup } from '../engine/setup';

export function RivalCard({ rival }: { rival: CarSetup }) {
  return (
    <li className="rival">
      <span className="rival-head">
        <span className="rival-chip" style={{ background: rival.color }} />
        <span className="rival-name">{rival.name}</span>
      </span>
      <span className="rival-bars">
        {STAT_KEYS.map((key) => (
          <span className="rival-bar" key={key} title={`${STAT_LABELS[key]} ${rival.stats[key]}`}>
            <span className="rival-bar-label">{STAT_LABELS[key].slice(0, 1)}</span>
            <span className="rival-bar-track">
              <span
                className="rival-bar-fill"
                style={{ width: `${(rival.stats[key] / STAT_MAXIMUM) * 100}%`, background: rival.color }}
              />
            </span>
          </span>
        ))}
      </span>
    </li>
  );
}
