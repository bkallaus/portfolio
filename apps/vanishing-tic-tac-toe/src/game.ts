export type Player = 'X' | 'O';

export type Placement = {
  id: number;
  player: Player;
  cell: number;
};

export type GameState = {
  placements: Placement[];
  currentPlayer: Player;
  nextPlacementId: number;
  winner: Player | null;
  winningCells: number[];
};

export const BOARD_SIZE = 9;
export const MARKS_PER_PLAYER = 3;

const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createGame(startingPlayer: Player = 'X'): GameState {
  return {
    placements: [],
    currentPlayer: startingPlayer,
    nextPlacementId: 1,
    winner: null,
    winningCells: [],
  };
}

export function occupantOf(state: GameState, cell: number): Player | null {
  const placement = state.placements.find((entry) => entry.cell === cell);
  return placement ? placement.player : null;
}

export function fadingPlacementId(state: GameState): number | null {
  if (state.winner) {
    return null;
  }
  const owned = state.placements.filter((entry) => entry.player === state.currentPlayer);
  if (owned.length < MARKS_PER_PLAYER) {
    return null;
  }
  return owned[0].id;
}

function findWinner(placements: Placement[]): { player: Player; cells: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const first = placements.find((entry) => entry.cell === a);
    if (!first) {
      continue;
    }
    const second = placements.find((entry) => entry.cell === b);
    const third = placements.find((entry) => entry.cell === c);
    if (second?.player === first.player && third?.player === first.player) {
      return { player: first.player, cells: line };
    }
  }
  return null;
}

export function placeMark(state: GameState, cell: number): GameState {
  if (state.winner || occupantOf(state, cell) !== null) {
    return state;
  }

  const newPlacement: Placement = {
    id: state.nextPlacementId,
    player: state.currentPlayer,
    cell,
  };

  let placements = [...state.placements, newPlacement];
  const owned = placements.filter((entry) => entry.player === state.currentPlayer);
  if (owned.length > MARKS_PER_PLAYER) {
    const oldestId = owned[0].id;
    placements = placements.filter((entry) => entry.id !== oldestId);
  }

  const outcome = findWinner(placements);

  return {
    placements,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    nextPlacementId: state.nextPlacementId + 1,
    winner: outcome ? outcome.player : null,
    winningCells: outcome ? outcome.cells : [],
  };
}
