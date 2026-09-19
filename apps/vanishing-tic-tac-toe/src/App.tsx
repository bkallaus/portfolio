import { useEffect, useRef, useState } from 'react';
import { launchConfetti } from './confetti';
import {
  BOARD_SIZE,
  createGame,
  fadingPlacementId,
  MARKS_PER_PLAYER,
  occupantOf,
  placeMark,
  type Player,
} from './game';

const CONFETTI_COLORS = ['#5cc8ff', '#ff8a5c', '#7df0a8', '#ffd45c', '#c98cff'];

function playerLabel(player: Player): string {
  return player === 'X' ? 'Player X' : 'Player O';
}

export default function App() {
  const [game, setGame] = useState(() => createGame());
  const celebratedFor = useRef<Player | null>(null);

  useEffect(() => {
    if (game.winner && celebratedFor.current !== game.winner) {
      celebratedFor.current = game.winner;
      launchConfetti(CONFETTI_COLORS);
    }
    if (!game.winner) {
      celebratedFor.current = null;
    }
  }, [game.winner]);

  const fadingId = fadingPlacementId(game);
  const cells = Array.from({ length: BOARD_SIZE }, (_, index) => index);

  const handleCellClick = (cell: number) => {
    setGame((current) => placeMark(current, cell));
  };

  const handleReset = () => {
    setGame(createGame());
  };

  const status = game.winner
    ? `${playerLabel(game.winner)} wins`
    : `${playerLabel(game.currentPlayer)} to move`;

  return (
    <main className="board-stage">
      <header className="masthead">
        <p className="eyebrow">Experiment</p>
        <h1>Vanishing Tic-Tac-Toe</h1>
        <p className="tagline">
          Each player keeps only {MARKS_PER_PLAYER} marks. Drop a fourth and your
          oldest one fades away, so the board never fills and never draws.
        </p>
      </header>

      <div
        className={`status-bar player-${game.currentPlayer.toLowerCase()}${game.winner ? ' status-bar--won' : ''}`}
        role="status"
        aria-live="polite"
      >
        {status}
      </div>

      <div className="board" role="grid" aria-label="Tic-tac-toe board">
        {cells.map((cell) => {
          const occupant = occupantOf(game, cell);
          const placement = game.placements.find((entry) => entry.cell === cell);
          const isFading = placement !== undefined && placement.id === fadingId;
          const isWinning = game.winningCells.includes(cell);

          const classes = ['cell'];
          if (occupant) {
            classes.push(`cell--${occupant.toLowerCase()}`);
          }
          if (isFading) {
            classes.push('cell--fading');
          }
          if (isWinning) {
            classes.push('cell--winning');
          }

          return (
            <button
              key={cell}
              type="button"
              className={classes.join(' ')}
              onClick={() => handleCellClick(cell)}
              disabled={occupant !== null || game.winner !== null}
              aria-label={`Cell ${cell + 1}${occupant ? `, ${occupant}` : ', empty'}${isFading ? ', about to vanish' : ''}`}
            >
              <span className="mark">{occupant}</span>
            </button>
          );
        })}
      </div>

      <div className="controls">
        <button type="button" className="reset-btn" onClick={handleReset}>
          New game
        </button>
        {!game.winner && fadingId !== null && (
          <p className="hint">The dimmed {game.currentPlayer} vanishes on your next move.</p>
        )}
      </div>
    </main>
  );
}
