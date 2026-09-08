type ToolbarProps = {
  seed: number;
  running: boolean;
  speed: number;
  evolving: boolean;
  generation: number;
  onNewTrack: () => void;
  onSeedChange: (seed: number) => void;
  onToggleRunning: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleEvolving: () => void;
  onRestart: () => void;
  onResetLearning: () => void;
};

const SPEEDS = [1, 2, 4, 8];

export function Toolbar({
  seed,
  running,
  speed,
  evolving,
  generation,
  onNewTrack,
  onSeedChange,
  onToggleRunning,
  onSpeedChange,
  onToggleEvolving,
  onRestart,
  onResetLearning,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button type="button" className="button button-primary" onClick={onToggleRunning}>
          {running ? 'Pause' : 'Run'}
        </button>
        <button type="button" className="button" onClick={onRestart}>
          Restart run
        </button>
      </div>

      <div className="toolbar-group">
        <span className="field-label">Speed</span>
        <div className="segmented">
          {SPEEDS.map((option) => (
            <button
              type="button"
              key={option}
              className={`segment ${speed === option ? 'is-active' : ''}`}
              onClick={() => onSpeedChange(option)}
            >
              {option}×
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-group">
        <label className="field">
          <span className="field-label">Track seed</span>
          <input
            className="input input-seed"
            type="number"
            value={seed}
            onChange={(event) => onSeedChange(Number(event.target.value) || 0)}
          />
        </label>
        <button type="button" className="button" onClick={onNewTrack}>
          New track
        </button>
      </div>

      <div className="toolbar-group toolbar-group-end">
        <span className="generation">gen {generation}</span>
        <button
          type="button"
          className={`button ${evolving ? 'button-active' : ''}`}
          onClick={onToggleEvolving}
          aria-pressed={evolving}
        >
          Evolution {evolving ? 'on' : 'off'}
        </button>
        <button type="button" className="button" onClick={onResetLearning}>
          Reset brains
        </button>
      </div>
    </div>
  );
}
