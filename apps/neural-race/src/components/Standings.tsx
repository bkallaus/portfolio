import type { Standing } from '../engine/race';

type StandingsProps = {
  entries: Standing[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const formatDistance = (value: number) => `${Math.max(0, Math.round(value))}m`;

const statusLabel = (entry: Standing) => {
  if (entry.alive) return `${Math.round(entry.speed)} px/s`;
  return entry.retirement === 'stalled' ? 'stalled' : 'crashed';
};

export function Standings({ entries, selectedId, onSelect }: StandingsProps) {
  return (
    <ol className="standings">
      {entries.map((entry, position) => (
        <li key={entry.id}>
          <button
            type="button"
            className={`standing ${entry.id === selectedId ? 'is-selected' : ''} ${entry.alive ? '' : 'is-out'}`}
            onClick={() => onSelect(entry.id)}
          >
            <span className="standing-position">{position + 1}</span>
            <span className="standing-chip" style={{ background: entry.color }} />
            <span className="standing-body">
              <span className="standing-name">{entry.name}</span>
              <span className="standing-status">{statusLabel(entry)}</span>
            </span>
            <span className="standing-numbers">
              <span className="standing-distance">{formatDistance(entry.distance)}</span>
              <span className="standing-meta">
                best {formatDistance(entry.best)} · gen {entry.generation}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
