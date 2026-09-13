import { GEMS, SPENDABLE } from "./theme.ts";
import type { GemColor, TokenKind } from "./theme.ts";
import { card, costTotal, royal } from "./cards.ts";
import {
  COLOUR_POINTS_TO_WIN,
  CROWNS_TO_WIN,
  POINTS_TO_WIN,
  TOKEN_LIMIT,
  applyMove,
  applyResolution,
  legalMoves,
  legalResolutions,
  payment,
  view,
} from "./engine.ts";
import type { GameState, Move, Resolution } from "./engine.ts";

const CROWN_WEIGHT = 2.6;
const POINT_WEIGHT = 1.9;
const BONUS_WEIGHT = 1.3;
const GOLD_WEIGHT = 1.1;
const PEARL_WEIGHT = 0.9;
const TOKEN_WEIGHT = 0.7;
const PRIVILEGE_WEIGHT = 0.8;
const ABILITY_WEIGHT = 0.6;
const OVERFLOW_PENALTY = 1.4;

function demand(state: GameState, player: number): Record<TokenKind, number> {
  const { bonuses } = view(state, player);
  const need: Record<TokenKind, number> = {
    quartz: 0,
    azurite: 0,
    verdite: 0,
    garnet: 0,
    obsidian: 0,
    pearl: 0,
    gold: 0,
  };
  const reachable = [
    ...state.market.flat().filter((id): id is string => id !== null),
    ...state.players[player].reserved,
  ];
  for (const id of reachable) {
    const wanted = card(id);
    const weight = 1 + wanted.points * 0.3 + wanted.crowns * 0.4;
    for (const kind of SPENDABLE) {
      const discount = kind === "pearl" ? 0 : bonuses[kind as GemColor];
      const owed = Math.max(0, (wanted.cost[kind] ?? 0) - discount);
      const short = Math.max(0, owed - state.players[player].tokens[kind]);
      need[kind] += short * weight;
    }
  }
  return need;
}

function progress(state: GameState, player: number): number {
  const seen = view(state, player);
  const bestColour = Math.max(...GEMS.map((gem) => seen.colourPoints[gem]));
  return (
    seen.points / POINTS_TO_WIN +
    bestColour / COLOUR_POINTS_TO_WIN +
    seen.crowns / CROWNS_TO_WIN
  );
}

function cardAppeal(state: GameState, player: number, id: string): number {
  const wanted = card(id);
  const seen = view(state, player);
  const colour = wanted.wildBonus ? bestWildColour(state, player) : wanted.color;
  const colourHeadroom = colour
    ? Math.min(wanted.points, Math.max(0, COLOUR_POINTS_TO_WIN - seen.colourPoints[colour]))
    : 0;
  const spend = payment(state, player, id);
  const goldSpent = spend ? spend.gold : 0;
  return (
    wanted.crowns * CROWN_WEIGHT +
    wanted.points * POINT_WEIGHT +
    wanted.bonus * BONUS_WEIGHT +
    colourHeadroom * 0.7 +
    (wanted.ability ? ABILITY_WEIGHT : 0) -
    goldSpent * GOLD_WEIGHT * 0.5 -
    costTotal(wanted.cost) * 0.08
  );
}

function bestWildColour(state: GameState, player: number): GemColor {
  const seen = view(state, player);
  return GEMS.reduce((best, gem) =>
    seen.colourPoints[gem] > seen.colourPoints[best] ? gem : best
  );
}

function tokenValue(state: GameState, player: number, kind: TokenKind): number {
  const need = demand(state, player);
  const base = kind === "gold" ? GOLD_WEIGHT * 3 : kind === "pearl" ? PEARL_WEIGHT : TOKEN_WEIGHT;
  return base + Math.min(need[kind], 6) * 0.45;
}

function scoreMove(state: GameState, player: number, move: Move): number {
  if (move.kind === "buy") {
    const after = applyMove(state, move);
    if (after.winner?.player === player) return 1000;
    return 46 + cardAppeal(state, player, move.card) + progress(after, player) * 6;
  }
  if (move.kind === "take") {
    const tokens = move.cells.map((cell) => state.board[cell] as TokenKind);
    const held = view(state, player).tokenCount;
    const overflow = Math.max(0, held + tokens.length - TOKEN_LIMIT);
    const sameColour = new Set(tokens).size === 1 && tokens.length === 3 ? PRIVILEGE_WEIGHT : 0;
    const crowding = held >= TOKEN_LIMIT - 2 ? (held - (TOKEN_LIMIT - 3)) * 2.2 : 0;
    return (
      18 +
      tokens.reduce((sum, kind) => sum + tokenValue(state, player, kind), 0) -
      overflow * OVERFLOW_PENALTY * 4 -
      crowding -
      sameColour
    );
  }
  if (move.kind === "reserve") {
    const wanted = card(move.card);
    const denial = wanted.tier === 3 ? 3 : wanted.tier === 2 ? 1.5 : 0;
    return 18 + cardAppeal(state, player, move.card) * 0.45 + denial + GOLD_WEIGHT * 2;
  }
  if (move.kind === "privilege") {
    const kind = state.board[move.cell] as TokenKind;
    const held = view(state, player).tokenCount;
    return 30 + tokenValue(state, player, kind) - (held >= TOKEN_LIMIT - 1 ? 60 : 0);
  }
  if (move.kind === "replenish") {
    const empties = state.board.filter((token) => token === null).length;
    const otherMoves = legalMoves(state, player).filter((option) => option.kind !== "replenish");
    if (otherMoves.length === 0) return 80;
    return empties >= 15 ? 14 : -5;
  }
  return -100;
}

export function chooseMove(state: GameState, player: number): Move {
  const options = legalMoves(state, player);
  let best = options[0];
  let bestScore = -Infinity;
  for (const option of options) {
    const score = scoreMove(state, player, option);
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best;
}

function scoreResolution(state: GameState, choice: Resolution): number {
  const player = state.pending[0].player;
  if (choice.kind === "royal") return royal(choice.card).points * 2 + (royal(choice.card).ability ? 1 : 0);
  if (choice.kind === "wild") return view(state, player).colourPoints[choice.color] + 1;
  if (choice.kind === "steal") return tokenValue(state, player, choice.token);
  if (choice.kind === "boardGem") {
    return tokenValue(state, player, state.board[choice.cell] as TokenKind);
  }
  const need = demand(state, player);
  return -(need[choice.token] + (choice.token === "gold" ? 9 : 0));
}

export function chooseResolution(state: GameState): Resolution {
  const options = legalResolutions(state);
  const player = state.pending[0].player;
  const winning = options.find(
    (option) => applyResolution(state, option).winner?.player === player
  );
  if (winning) return winning;
  let best = options[0];
  let bestScore = -Infinity;
  for (const option of options) {
    const score = scoreResolution(state, option);
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best;
}
