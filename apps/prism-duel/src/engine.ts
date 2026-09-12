import { GEMS, SPENDABLE } from "./theme.ts";
import type { GemColor, TokenKind } from "./theme.ts";
import { CARDS, MARKET_WIDTH, ROYALS, card, royal } from "./cards.ts";
import type { Ability, Card, Cost } from "./cards.ts";

export const BOARD_SIZE = 5;
export const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;
export const TOKEN_LIMIT = 10;
export const RESERVE_LIMIT = 3;
export const PRIVILEGE_SUPPLY = 3;
export const ROYAL_SLOTS = 4;
export const POINTS_TO_WIN = 20;
export const COLOUR_POINTS_TO_WIN = 10;
export const CROWNS_TO_WIN = 10;
export const ROYAL_CROWN_STEPS = [3, 6];
export const STALEMATE_TURNS = 16;

export const BAG_CONTENTS: TokenKind[] = [
  ...GEMS.flatMap((gem) => [gem, gem, gem, gem]),
  "pearl",
  "pearl",
  "gold",
  "gold",
  "gold",
];

export type TokenPile = Record<TokenKind, number>;

export interface PlayerState {
  tokens: TokenPile;
  cards: string[];
  reserved: string[];
  royals: string[];
  privileges: number;
  wildChoice: Record<string, GemColor>;
  royalsClaimed: number;
}

export type Pending =
  | { type: "discard"; player: number; count: number }
  | { type: "wild"; player: number; card: string }
  | { type: "steal"; player: number }
  | { type: "royal"; player: number }
  | { type: "boardGem"; player: number; color: GemColor | null };

export type WinReason = "points" | "colour" | "crowns" | "stalemate";

export interface GameState {
  names: [string, string];
  board: (TokenKind | null)[];
  bag: TokenKind[];
  decks: [string[], string[], string[]];
  market: [(string | null)[], (string | null)[], (string | null)[]];
  royals: (string | null)[];
  privileges: number;
  players: [PlayerState, PlayerState];
  turn: number;
  acting: boolean;
  extraTurn: boolean;
  pending: Pending[];
  log: string[];
  winner: { player: number | null; by: WinReason } | null;
  idleTurns: number;
  cardsOwned: number;
  rng: number;
}

export interface PlayerView {
  bonuses: Record<GemColor, number>;
  points: number;
  colourPoints: Record<GemColor, number>;
  crowns: number;
  tokenCount: number;
  royalsDue: number;
}

export const emptyPile = (): TokenPile => ({
  quartz: 0,
  azurite: 0,
  verdite: 0,
  garnet: 0,
  obsidian: 0,
  pearl: 0,
  gold: 0,
});

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function nextRandom(state: GameState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function drawFromBag(state: GameState): TokenKind | null {
  if (state.bag.length === 0) return null;
  const at = Math.floor(nextRandom(state) * state.bag.length);
  return state.bag.splice(at, 1)[0];
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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

export const SPIRAL: number[] = buildSpiral();

function buildSpiral(): number[] {
  const order: number[] = [];
  const centre = Math.floor(BOARD_SIZE / 2);
  let row = centre;
  let col = centre;
  const steps: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  const push = () => {
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      order.push(row * BOARD_SIZE + col);
    }
  };
  push();
  let run = 1;
  let direction = 0;
  while (order.length < BOARD_CELLS) {
    for (let twice = 0; twice < 2 && order.length < BOARD_CELLS; twice += 1) {
      const [dr, dc] = steps[direction % steps.length];
      for (let step = 0; step < run && order.length < BOARD_CELLS; step += 1) {
        row += dr;
        col += dc;
        push();
      }
      direction += 1;
    }
    run += 1;
  }
  return order;
}

const freshPlayer = (): PlayerState => ({
  tokens: emptyPile(),
  cards: [],
  reserved: [],
  royals: [],
  privileges: 0,
  wildChoice: {},
  royalsClaimed: 0,
});

export function newGame(names: [string, string] = ["You", "Opponent"], seed = Date.now()): GameState {
  const random = mulberry32(seed);
  const tierIds = (tier: 1 | 2 | 3) =>
    shuffled(
      CARDS.filter((entry) => entry.tier === tier).map((entry) => entry.id),
      random
    );
  const state: GameState = {
    names,
    board: new Array(BOARD_CELLS).fill(null),
    bag: shuffled(BAG_CONTENTS, random),
    decks: [tierIds(1), tierIds(2), tierIds(3)],
    market: [[], [], []],
    royals: shuffled(
      ROYALS.map((entry) => entry.id),
      random
    ).slice(0, ROYAL_SLOTS),
    privileges: PRIVILEGE_SUPPLY - 1,
    players: [freshPlayer(), freshPlayer()],
    turn: 0,
    acting: false,
    extraTurn: false,
    pending: [],
    log: [],
    winner: null,
    idleTurns: 0,
    cardsOwned: 0,
    rng: (seed * 2654435761) | 0,
  };
  state.players[1].privileges = 1;
  for (const tier of [1, 2, 3] as const) {
    state.market[tier - 1] = new Array(MARKET_WIDTH[tier]).fill(null);
    refillMarket(state, tier);
  }
  fillBoard(state);
  note(state, `${names[1]} goes second and starts with 1 privilege.`);
  return state;
}

function refillMarket(state: GameState, tier: 1 | 2 | 3): void {
  const row = state.market[tier - 1];
  const deck = state.decks[tier - 1];
  for (let slot = 0; slot < row.length; slot += 1) {
    if (row[slot] === null && deck.length > 0) row[slot] = deck.shift() ?? null;
  }
}

function fillBoard(state: GameState): number {
  let placed = 0;
  for (const cell of SPIRAL) {
    if (state.board[cell] !== null) continue;
    const token = drawFromBag(state);
    if (token === null) break;
    state.board[cell] = token;
    placed += 1;
  }
  return placed;
}

function note(state: GameState, text: string): void {
  state.log.unshift(text);
  if (state.log.length > 60) state.log.length = 60;
}

export const cellOf = (row: number, col: number): number => row * BOARD_SIZE + col;
export const rowColOf = (cell: number): [number, number] => [
  Math.floor(cell / BOARD_SIZE),
  cell % BOARD_SIZE,
];

const LINE_DIRECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function isStraightLine(cells: number[]): boolean {
  if (cells.length === 1) return true;
  const points = cells.map(rowColOf);
  for (const [dr, dc] of LINE_DIRECTIONS) {
    for (const start of points) {
      const wanted = points.map((_, index) => [start[0] + dr * index, start[1] + dc * index]);
      const sameSet = wanted.every(([r, c]) =>
        points.some(([pr, pc]) => pr === r && pc === c)
      );
      if (sameSet) return true;
    }
  }
  return false;
}

export function canTakeTokens(state: GameState, cells: number[]): boolean {
  if (state.winner || state.acting || state.pending.length > 0) return false;
  if (cells.length < 1 || cells.length > 3) return false;
  if (new Set(cells).size !== cells.length) return false;
  if (cells.some((cell) => cell < 0 || cell >= BOARD_CELLS)) return false;
  const tokens = cells.map((cell) => state.board[cell]);
  if (tokens.some((token) => token === null || token === "gold")) return false;
  return isStraightLine(cells);
}

export function lineOptions(state: GameState): number[][] {
  const options: number[][] = [];
  const usable = (cell: number) => {
    const token = state.board[cell];
    return token !== null && token !== "gold";
  };
  for (let cell = 0; cell < BOARD_CELLS; cell += 1) {
    if (usable(cell)) options.push([cell]);
  }
  for (const [dr, dc] of LINE_DIRECTIONS) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        for (const length of [2, 3]) {
          const cells: number[] = [];
          for (let step = 0; step < length; step += 1) {
            const r = row + dr * step;
            const c = col + dc * step;
            if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
            cells.push(cellOf(r, c));
          }
          if (cells.length === length && cells.every(usable)) options.push(cells);
        }
      }
    }
  }
  return options;
}

export function view(state: GameState, player: number): PlayerView {
  const me = state.players[player];
  const bonuses: Record<GemColor, number> = {
    quartz: 0,
    azurite: 0,
    verdite: 0,
    garnet: 0,
    obsidian: 0,
  };
  const colourPoints: Record<GemColor, number> = {
    quartz: 0,
    azurite: 0,
    verdite: 0,
    garnet: 0,
    obsidian: 0,
  };
  let points = 0;
  let crowns = 0;
  for (const id of me.cards) {
    const owned = card(id);
    const colour = owned.wildBonus ? me.wildChoice[id] : owned.color;
    points += owned.points;
    crowns += owned.crowns;
    if (colour) {
      bonuses[colour] += owned.bonus;
      colourPoints[colour] += owned.points;
    }
  }
  for (const id of me.royals) points += royal(id).points;
  const tokenCount = SPENDABLE.concat("gold").reduce((sum, kind) => sum + me.tokens[kind], 0);
  const reached = ROYAL_CROWN_STEPS.filter((step) => crowns >= step).length;
  return {
    bonuses,
    points,
    colourPoints,
    crowns,
    tokenCount,
    royalsDue: Math.max(0, reached - me.royalsClaimed),
  };
}

export function payment(state: GameState, player: number, id: string): TokenPile | null {
  const me = state.players[player];
  const { bonuses } = view(state, player);
  const need: Cost = card(id).cost;
  const spend = emptyPile();
  let gold = 0;
  for (const kind of SPENDABLE) {
    const discount = kind === "pearl" ? 0 : bonuses[kind as GemColor];
    const owed = Math.max(0, (need[kind] ?? 0) - discount);
    const paid = Math.min(owed, me.tokens[kind]);
    spend[kind] = paid;
    gold += owed - paid;
  }
  if (gold > me.tokens.gold) return null;
  spend.gold = gold;
  return spend;
}

export const canBuy = (state: GameState, player: number, id: string): boolean =>
  !state.winner &&
  !state.acting &&
  state.pending.length === 0 &&
  state.turn === player &&
  buyableIds(state, player).includes(id) &&
  payment(state, player, id) !== null;

const buyableIds = (state: GameState, player: number): string[] => [
  ...state.market.flat().filter((id): id is string => id !== null),
  ...state.players[player].reserved,
];

function grantPrivilege(state: GameState, to: number): void {
  if (state.privileges > 0) {
    state.privileges -= 1;
    state.players[to].privileges += 1;
    return;
  }
  const other = 1 - to;
  if (state.players[other].privileges > 0) {
    state.players[other].privileges -= 1;
    state.players[to].privileges += 1;
  }
}

export const canSpendPrivilege = (state: GameState, player: number): boolean =>
  !state.winner &&
  !state.acting &&
  state.pending.length === 0 &&
  state.turn === player &&
  state.players[player].privileges > 0 &&
  state.board.some((token) => token !== null && token !== "gold");

export function spendPrivilege(state: GameState, cell: number): GameState {
  const next = clone(state);
  const player = next.turn;
  if (!canSpendPrivilege(next, player)) return state;
  const token = next.board[cell];
  if (token === null || token === "gold") return state;
  next.players[player].privileges -= 1;
  next.privileges += 1;
  next.board[cell] = null;
  next.players[player].tokens[token] += 1;
  note(next, `${next.names[player]} spent a privilege for 1 ${token}.`);
  return next;
}

export const canReplenish = (state: GameState, player: number): boolean =>
  !state.winner &&
  !state.acting &&
  state.pending.length === 0 &&
  state.turn === player &&
  state.bag.length > 0 &&
  state.board.some((token) => token === null);

export function replenish(state: GameState): GameState {
  const next = clone(state);
  const player = next.turn;
  if (!canReplenish(next, player)) return state;
  const placed = fillBoard(next);
  grantPrivilege(next, 1 - player);
  note(next, `${next.names[player]} replenished the board with ${placed} tokens; ${next.names[1 - player]} gained a privilege.`);
  return next;
}

export function takeTokens(state: GameState, cells: number[]): GameState {
  const next = clone(state);
  const player = next.turn;
  if (!canTakeTokens(next, cells)) return state;
  const taken = cells.map((cell) => next.board[cell] as TokenKind);
  next.acting = true;
  for (const cell of cells) next.board[cell] = null;
  for (const token of taken) next.players[player].tokens[token] += 1;
  note(next, `${next.names[player]} took ${taken.join(", ")}.`);
  if (taken.length === 3 && new Set(taken).size === 1) {
    grantPrivilege(next, 1 - player);
    note(next, `Three matching tokens — ${next.names[1 - player]} gained a privilege.`);
  }
  return settle(next);
}

export const canReserve = (state: GameState, player: number, id: string): boolean =>
  !state.winner &&
  !state.acting &&
  state.pending.length === 0 &&
  state.turn === player &&
  state.players[player].reserved.length < RESERVE_LIMIT &&
  state.board.some((token) => token === "gold") &&
  state.market.flat().includes(id);

export function reserveCard(state: GameState, id: string, goldCell?: number): GameState {
  const next = clone(state);
  const player = next.turn;
  if (!canReserve(next, player, id)) return state;
  const cell = goldCell !== undefined && next.board[goldCell] === "gold"
    ? goldCell
    : next.board.indexOf("gold");
  next.acting = true;
  next.board[cell] = null;
  next.players[player].tokens.gold += 1;
  next.players[player].reserved.push(id);
  removeFromMarket(next, id);
  note(next, `${next.names[player]} took a gold token and reserved a card.`);
  return settle(next);
}

function removeFromMarket(state: GameState, id: string): void {
  for (const [index, row] of state.market.entries()) {
    const slot = row.indexOf(id);
    if (slot === -1) continue;
    row[slot] = null;
    refillMarket(state, (index + 1) as 1 | 2 | 3);
    return;
  }
}

export function buyCard(state: GameState, id: string): GameState {
  const next = clone(state);
  const player = next.turn;
  if (!canBuy(next, player, id)) return state;
  const spend = payment(next, player, id);
  if (!spend) return state;
  next.acting = true;
  const me = next.players[player];
  for (const kind of SPENDABLE.concat("gold")) {
    me.tokens[kind] -= spend[kind];
    for (let n = 0; n < spend[kind]; n += 1) next.bag.push(kind);
  }
  const reservedAt = me.reserved.indexOf(id);
  if (reservedAt >= 0) me.reserved.splice(reservedAt, 1);
  else removeFromMarket(next, id);
  me.cards.push(id);
  const bought = card(id);
  note(next, `${next.names[player]} bought a ${describe(bought)}.`);
  if (bought.wildBonus) next.pending.push({ type: "wild", player, card: id });
  else if (bought.ability) queueAbility(next, player, bought.ability, bought.color);
  queueRoyals(next, player);
  return settle(next);
}

const describe = (entry: Card): string => {
  const colour = entry.color ?? "neutral";
  const bits = [`tier ${entry.tier} ${colour} card`];
  if (entry.points) bits.push(`${entry.points} pts`);
  if (entry.crowns) bits.push(`${entry.crowns} crowns`);
  return bits.join(", ");
};

function queueAbility(
  state: GameState,
  player: number,
  ability: Ability,
  colour: GemColor | null
): void {
  if (ability === "privilege") {
    grantPrivilege(state, player);
    note(state, `${state.names[player]} took a privilege.`);
    return;
  }
  if (ability === "again") {
    state.extraTurn = true;
    note(state, `${state.names[player]} takes another turn.`);
    return;
  }
  if (ability === "steal") {
    const victim = state.players[1 - player];
    const has = SPENDABLE.some((kind) => victim.tokens[kind] > 0);
    if (has) state.pending.push({ type: "steal", player });
    return;
  }
  const wanted = ability === "gem" ? colour : null;
  const available = state.board.some(
    (token) => token !== null && token !== "gold" && (wanted === null || token === wanted)
  );
  if (available) state.pending.push({ type: "boardGem", player, color: wanted });
}

function queueRoyals(state: GameState, player: number): void {
  const me = state.players[player];
  let due = view(state, player).royalsDue;
  while (due > 0 && state.royals.some((slot) => slot !== null) && me.royals.length < 2) {
    state.pending.push({ type: "royal", player });
    me.royalsClaimed += 1;
    due -= 1;
  }
}

export function resolveWild(state: GameState, colour: GemColor): GameState {
  const next = clone(state);
  const head = next.pending[0];
  if (head?.type !== "wild") return state;
  next.pending.shift();
  next.players[head.player].wildChoice[head.card] = colour;
  note(next, `${next.names[head.player]} set a neutral card to ${colour}.`);
  const entry = card(head.card);
  if (entry.ability) queueAbility(next, head.player, entry.ability, colour);
  queueRoyals(next, head.player);
  return settle(next);
}

export function resolveSteal(state: GameState, kind: TokenKind): GameState {
  const next = clone(state);
  const head = next.pending[0];
  if (head?.type !== "steal") return state;
  if (kind === "gold") return state;
  const victim = next.players[1 - head.player];
  if (victim.tokens[kind] <= 0) return state;
  next.pending.shift();
  victim.tokens[kind] -= 1;
  next.players[head.player].tokens[kind] += 1;
  note(next, `${next.names[head.player]} took 1 ${kind} from ${next.names[1 - head.player]}.`);
  return settle(next);
}

export function resolveBoardGem(state: GameState, cell: number): GameState {
  const next = clone(state);
  const head = next.pending[0];
  if (head?.type !== "boardGem") return state;
  const token = next.board[cell];
  if (token === null || token === "gold") return state;
  if (head.color !== null && token !== head.color) return state;
  next.pending.shift();
  next.board[cell] = null;
  next.players[head.player].tokens[token] += 1;
  note(next, `${next.names[head.player]} claimed 1 ${token} from the board.`);
  return settle(next);
}

export function resolveRoyal(state: GameState, id: string): GameState {
  const next = clone(state);
  const head = next.pending[0];
  if (head?.type !== "royal") return state;
  const slot = next.royals.indexOf(id);
  if (slot === -1) return state;
  next.pending.shift();
  next.royals[slot] = null;
  next.players[head.player].royals.push(id);
  const claimed = royal(id);
  note(next, `${next.names[head.player]} claimed ${claimed.name}.`);
  if (claimed.ability) queueAbility(next, head.player, claimed.ability, null);
  return settle(next);
}

export function resolveDiscard(state: GameState, kind: TokenKind): GameState {
  const next = clone(state);
  const head = next.pending[0];
  if (head?.type !== "discard") return state;
  const me = next.players[head.player];
  if (me.tokens[kind] <= 0) return state;
  me.tokens[kind] -= 1;
  next.bag.push(kind);
  head.count -= 1;
  if (head.count <= 0) next.pending.shift();
  note(next, `${next.names[head.player]} returned 1 ${kind} to the bag.`);
  return settle(next);
}

function settle(state: GameState): GameState {
  if (state.pending.length > 0) return state;
  if (!state.acting) return state;
  const player = state.turn;
  const over = view(state, player).tokenCount - TOKEN_LIMIT;
  if (over > 0) {
    state.pending.push({ type: "discard", player, count: over });
    return state;
  }
  return finishTurn(state);
}

export function victoryFor(state: GameState, player: number): WinReason | null {
  const seen = view(state, player);
  if (seen.crowns >= CROWNS_TO_WIN) return "crowns";
  if (GEMS.some((gem) => seen.colourPoints[gem] >= COLOUR_POINTS_TO_WIN)) return "colour";
  if (seen.points >= POINTS_TO_WIN) return "points";
  return null;
}

function finishTurn(state: GameState): GameState {
  const player = state.turn;
  state.acting = false;
  const reason = victoryFor(state, player);
  if (reason) {
    state.winner = { player, by: reason };
    state.extraTurn = false;
    note(state, `${state.names[player]} wins on ${reason}.`);
    return state;
  }
  trackProgress(state);
  if (state.idleTurns >= STALEMATE_TURNS) return callStalemate(state);
  if (state.extraTurn) {
    state.extraTurn = false;
    return state;
  }
  state.turn = 1 - player;
  return state;
}

function trackProgress(state: GameState): void {
  const owned = state.players[0].cards.length + state.players[1].cards.length;
  if (owned === state.cardsOwned) {
    state.idleTurns += 1;
    return;
  }
  state.cardsOwned = owned;
  state.idleTurns = 0;
}

function callStalemate(state: GameState): GameState {
  state.extraTurn = false;
  const scores = [view(state, 0), view(state, 1)];
  const ranked = [
    scores[0].points * 100 + scores[0].crowns,
    scores[1].points * 100 + scores[1].crowns,
  ];
  const leader = ranked[0] === ranked[1] ? null : ranked[0] > ranked[1] ? 0 : 1;
  state.winner = { player: leader, by: "stalemate" };
  note(
    state,
    leader === null
      ? `${STALEMATE_TURNS} turns without a purchase — the duel is a draw.`
      : `${STALEMATE_TURNS} turns without a purchase — ${state.names[leader]} leads on points.`
  );
  return state;
}

export function hasMainAction(state: GameState, player: number): boolean {
  if (state.winner || state.acting || state.pending.length > 0) return false;
  if (state.turn !== player) return false;
  if (lineOptions(state).length > 0) return true;
  if (state.board.includes("gold") && state.players[player].reserved.length < RESERVE_LIMIT) {
    return state.market.flat().some((id) => id !== null);
  }
  return buyableIds(state, player).some((id) => payment(state, player, id) !== null);
}

export const mustReplenish = (state: GameState, player: number): boolean =>
  !hasMainAction(state, player) && canReplenish(state, player);

export function pass(state: GameState): GameState {
  const player = state.turn;
  if (hasMainAction(state, player) || canReplenish(state, player)) return state;
  if (state.winner || state.pending.length > 0) return state;
  const next = clone(state);
  next.acting = true;
  note(next, `${next.names[player]} had no legal action and passed.`);
  return settle(next);
}

export type Move =
  | { kind: "take"; cells: number[] }
  | { kind: "buy"; card: string }
  | { kind: "reserve"; card: string; goldCell: number }
  | { kind: "replenish" }
  | { kind: "privilege"; cell: number }
  | { kind: "pass" };

export type Resolution =
  | { kind: "wild"; color: GemColor }
  | { kind: "steal"; token: TokenKind }
  | { kind: "boardGem"; cell: number }
  | { kind: "royal"; card: string }
  | { kind: "discard"; token: TokenKind };

export function legalMoves(state: GameState, player: number): Move[] {
  if (state.winner || state.turn !== player || state.acting || state.pending.length > 0) return [];
  const moves: Move[] = [];
  for (const cells of lineOptions(state)) moves.push({ kind: "take", cells });
  for (const id of buyableIds(state, player)) {
    if (payment(state, player, id) !== null) moves.push({ kind: "buy", card: id });
  }
  const goldCell = state.board.indexOf("gold");
  if (goldCell >= 0 && state.players[player].reserved.length < RESERVE_LIMIT) {
    for (const id of state.market.flat()) {
      if (id !== null) moves.push({ kind: "reserve", card: id, goldCell });
    }
  }
  if (canReplenish(state, player)) moves.push({ kind: "replenish" });
  if (canSpendPrivilege(state, player)) {
    for (const [cell, token] of state.board.entries()) {
      if (token !== null && token !== "gold") moves.push({ kind: "privilege", cell });
    }
  }
  if (moves.length === 0) moves.push({ kind: "pass" });
  return moves;
}

export function applyMove(state: GameState, move: Move): GameState {
  if (move.kind === "take") return takeTokens(state, move.cells);
  if (move.kind === "buy") return buyCard(state, move.card);
  if (move.kind === "reserve") return reserveCard(state, move.card, move.goldCell);
  if (move.kind === "replenish") return replenish(state);
  if (move.kind === "privilege") return spendPrivilege(state, move.cell);
  return pass(state);
}

export function legalResolutions(state: GameState): Resolution[] {
  const head = state.pending[0];
  if (!head) return [];
  if (head.type === "wild") return GEMS.map((color) => ({ kind: "wild", color }) as Resolution);
  if (head.type === "steal") {
    const victim = state.players[1 - head.player];
    return SPENDABLE.filter((kind) => victim.tokens[kind] > 0).map(
      (token) => ({ kind: "steal", token }) as Resolution
    );
  }
  if (head.type === "boardGem") {
    const options: Resolution[] = [];
    for (const [cell, token] of state.board.entries()) {
      if (token === null || token === "gold") continue;
      if (head.color !== null && token !== head.color) continue;
      options.push({ kind: "boardGem", cell });
    }
    return options;
  }
  if (head.type === "royal") {
    return state.royals
      .filter((id): id is string => id !== null)
      .map((id) => ({ kind: "royal", card: id }) as Resolution);
  }
  const me = state.players[head.player];
  return SPENDABLE.concat("gold")
    .filter((kind) => me.tokens[kind] > 0)
    .map((token) => ({ kind: "discard", token }) as Resolution);
}

export function applyResolution(state: GameState, choice: Resolution): GameState {
  if (choice.kind === "wild") return resolveWild(state, choice.color);
  if (choice.kind === "steal") return resolveSteal(state, choice.token);
  if (choice.kind === "boardGem") return resolveBoardGem(state, choice.cell);
  if (choice.kind === "royal") return resolveRoyal(state, choice.card);
  return resolveDiscard(state, choice.token);
}
