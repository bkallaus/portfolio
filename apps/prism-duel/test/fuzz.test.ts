import {
  TOKEN_LIMIT,
  applyMove,
  applyResolution,
  legalMoves,
  legalResolutions,
  newGame,
  victoryFor,
  view,
} from "../src/engine.ts";
import type { GameState } from "../src/engine.ts";
import { chooseMove, chooseResolution } from "../src/bot.ts";
import { check, equal, report } from "./harness.ts";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Outcome {
  state: GameState;
  steps: number;
  stalled: boolean;
  invariant: string | null;
}

function invariantBreach(state: GameState): string | null {
  if (state.board.length !== 25) return "board lost a cell";
  const heldPrivileges = state.players[0].privileges + state.players[1].privileges;
  if (heldPrivileges + state.privileges !== 3) return "privileges leaked";
  if (state.players.some((player) => player.reserved.length > 3)) return "reserve overflowed";
  if (state.players.some((player) => player.royals.length > 2)) return "too many royals";
  const idle = 1 - state.turn;
  if (state.pending.length === 0 && view(state, idle).tokenCount > TOKEN_LIMIT) {
    return "the idle player is over the token limit";
  }
  for (const player of [0, 1]) {
    for (const kind of Object.values(state.players[player].tokens)) {
      if (kind < 0) return "negative token count";
    }
  }
  const tokensInPlay =
    state.bag.length +
    state.board.filter((token) => token !== null).length +
    state.players.reduce(
      (sum, player) => sum + Object.values(player.tokens).reduce((a, b) => a + b, 0),
      0
    );
  if (tokensInPlay !== 25) return `tokens conserved badly (${tokensInPlay})`;
  const ownedCards = state.players.reduce(
    (sum, player) => sum + player.cards.length + player.reserved.length,
    0
  );
  const onTable = state.market.flat().filter((id) => id !== null).length;
  const inDecks = state.decks.reduce((sum, deck) => sum + deck.length, 0);
  if (ownedCards + onTable + inDecks !== 67) return "cards conserved badly";
  const allCardIds = state.players.flatMap((player) => [...player.cards, ...player.reserved]);
  if (new Set(allCardIds).size !== allCardIds.length) return "a card was duplicated";
  return null;
}

function play(seed: number, pick: (state: GameState, player: number) => number): Outcome {
  const random = mulberry32(seed);
  let state = newGame(["A", "B"], seed);
  let steps = 0;
  while (!state.winner && steps < 4000) {
    steps += 1;
    const breach = invariantBreach(state);
    if (breach) return { state, steps, stalled: false, invariant: breach };
    if (state.pending.length > 0) {
      const options = legalResolutions(state);
      if (options.length === 0) return { state, steps, stalled: true, invariant: null };
      const next = applyResolution(state, options[Math.floor(random() * options.length)]);
      if (next === state) return { state, steps, stalled: true, invariant: null };
      state = next;
      continue;
    }
    const moves = legalMoves(state, state.turn);
    if (moves.length === 0) return { state, steps, stalled: true, invariant: null };
    const next = applyMove(state, moves[pick(state, state.turn) % moves.length]);
    if (next === state) return { state, steps, stalled: true, invariant: null };
    state = next;
  }
  return { state, steps, stalled: !state.winner, invariant: null };
}

const GAMES = 600;
let stalls = 0;
let breaches = 0;
let wins = 0;
let totalSteps = 0;
const reasons = new Set<string>();

for (let seed = 1; seed <= GAMES; seed += 1) {
  const random = mulberry32(seed * 7919);
  const outcome = play(seed, (state) => Math.floor(random() * legalMoves(state, state.turn).length));
  if (outcome.invariant) {
    breaches += 1;
    if (breaches <= 3) console.log(`  seed ${seed}: ${outcome.invariant}`);
  }
  if (outcome.stalled) {
    stalls += 1;
    if (stalls <= 3) console.log(`  seed ${seed}: stalled after ${outcome.steps} steps`);
  }
  if (outcome.state.winner) {
    wins += 1;
    reasons.add(outcome.state.winner.by);
  }
  totalSteps += outcome.steps;
}

equal(`${GAMES} random games break no invariant`, breaches, 0);
equal(`${GAMES} random games never stall`, stalls, 0);
equal(`${GAMES} random games all reach a winner`, wins, GAMES);
check(
  "random play finds every victory route",
  reasons.has("points") && reasons.has("colour") && reasons.has("crowns"),
  `saw ${[...reasons].join(", ")}`
);
check(
  "random games are not absurdly long",
  totalSteps / GAMES < 600,
  `average ${Math.round(totalSteps / GAMES)} steps`
);

let botStalls = 0;
let botBreaches = 0;
let botWins = 0;
let botSteps = 0;
const BOT_GAMES = 120;
for (let seed = 1; seed <= BOT_GAMES; seed += 1) {
  let state = newGame(["Bot A", "Bot B"], seed * 31);
  let steps = 0;
  while (!state.winner && steps < 4000) {
    steps += 1;
    const breach = invariantBreach(state);
    if (breach) {
      botBreaches += 1;
      break;
    }
    const next =
      state.pending.length > 0
        ? applyResolution(state, chooseResolution(state))
        : applyMove(state, chooseMove(state, state.turn));
    if (next === state) {
      botStalls += 1;
      break;
    }
    state = next;
  }
  if (state.winner) botWins += 1;
  botSteps += steps;
}

equal(`${BOT_GAMES} bot games break no invariant`, botBreaches, 0);
equal(`${BOT_GAMES} bot games never stall`, botStalls, 0);
equal(`${BOT_GAMES} bot games all finish`, botWins, BOT_GAMES);
check(
  "the bot plays faster than random",
  botSteps / BOT_GAMES < totalSteps / GAMES,
  `bot ${Math.round(botSteps / BOT_GAMES)} vs random ${Math.round(totalSteps / GAMES)}`
);

const settled = newGame(["A", "B"], 4242);
equal("a fresh game has no winner", victoryFor(settled, 0), null);

report("fuzz");
