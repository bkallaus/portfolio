import type { Standing } from '../engine/race';

type StandingsProps = {
  entries: Standing[];
  highlightId: string;
};

const formatGap = (entry: Standing) => {
  if (entry.position === 1) return entry.finished ? 'winner' : 'leader';
  if (entry.finishGap !== null) return `+${entry.finishGap.toFixed(2)}s`;
  return `${Math.round(entry.gap)}m back`;
};

export function Standings({ entries, highlightId }: StandingsProps) {
  return (
    <ol className="standings">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={`standing ${entry.id === highlightId ? 'is-you' : ''} ${entry.finished ? 'is-done' : ''}`}
        >
          <span className="standing-position">{entry.position}</span>
          <span className="standing-chip" style={{ background: entry.color }} />
          <span className="standing-body">
            <span className="standing-name">{entry.name}</span>
            <span className="standing-meta">
              lap {entry.lap} · best {entry.bestLapTime === null ? '—' : `${entry.bestLapTime.toFixed(2)}s`}
            </span>
          </span>
          <span className="standing-gap">{formatGap(entry)}</span>
        </li>
      ))}
    </ol>
  );
}
