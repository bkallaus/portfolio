import { RES } from "./theme.ts";
import type { CardColor, Resource, ScienceSymbol } from "./theme.ts";

/* ============================================================
   MODEL
   The state is a plain JSON tree — it has to be, since a move is
   shipped over the wire verbatim and adopted wholesale by the other
   peer. Nothing here is a class and nothing carries methods.
   ============================================================ */
export type Cost = Partial<Record<Resource, number>> & { coins?: number };
export type Production = Partial<Record<Resource, number>>;

export interface GuildRule {
  colors?: CardColor[];
  coin?: number;
  vp?: number;
  wonders?: boolean;
  treasury?: boolean;
}

export interface Card {
  id: string;
  name: string;
  /** 1-3, or 0 for a guild (which belongs to no single age). */
  age: number;
  color: CardColor;
  cost: Cost;
  vp: number;
  shields: number;
  prod?: Production;
  prodChoice?: Resource[];
  sci?: ScienceSymbol;
  gainCoins?: number;
  fixTrade?: Resource[];
  chainFrom?: string;
  coinsPer?: { colors: CardColor[]; n: number };
  coinsPerWonder?: number;
  guild?: GuildRule;
}

export interface Wonder {
  id: string;
  name: string;
  cost: Cost;
  vp: number;
  text: string;
  shields?: number;
  gainCoins?: number;
  oppLoses?: number;
  again?: boolean;
  destroy?: CardColor;
  library?: boolean;
  mausoleum?: boolean;
  prodChoice?: Resource[];
}

export interface ProgressToken {
  id: string;
  name: string;
  text: string;
  coins?: number;
  vp?: number;
  sci?: ScienceSymbol;
}

export type Age = 1 | 2 | 3;
export type Phase = "draft" | "play" | "over";

export interface Slot {
  id: number;
  row: number;
  col: number;
  /** A card id, "?" for an undealt face-down slot, or null once taken. */
  card: string | null;
  up: boolean;
  coveredBy: number[];
}

export interface WonderSlot {
  id: string;
  built: boolean;
}

export interface PlayerState {
  coins: number;
  built: string[];
  wonders: WonderSlot[];
  tokens: string[];
}

/* A mid-turn decision the reducer refuses to move past until it's resolved.
   It lives in the state, not in React, so a refresh can't lose it. */
export type Pending =
  | { type: "progress"; player: number }
  | { type: "destroy"; player: number; color: CardColor; again: boolean }
  | { type: "library"; player: number; options: string[]; again: boolean }
  | { type: "mausoleum"; player: number; again: boolean }
  | { type: "first"; player: number; next: Age };

export type WinReason = "military" | "science" | "points" | "tiebreak" | "draw";
export interface Winner {
  /** null on a draw. */
  p: number | null;
  by: WinReason;
}

export interface GameState {
  phase: Phase;
  names: string[];
  players: PlayerState[];
  conflict: number;
  loot: { p0_2: boolean; p0_5: boolean; p1_2: boolean; p1_5: boolean };
  board: string[];
  box: string[];
  discard: string[];
  wondersBuilt: number;
  turn: number;
  first: number;
  pending: Pending | null;
  winner: Winner | null;
  log: string[];
  draftPool: string[];
  draftStep: number;
  draftAll: string[];
  slots: Slot[];
  deck: string[];
  age: Age;
  remaining: number;
}

/* Everything derived from a PlayerState, computed on demand. Deliberately
   not stored — see the note about caching in the README. */
export interface PlayerView {
  p: PlayerState;
  cards: Card[];
  wonders: Wonder[];
  prod: Production;
  choices: Resource[][];
  brownGrey: Production;
  fixTrade: Set<Resource>;
  shields: number;
  sci: Partial<Record<ScienceSymbol, number>>;
  has: Set<string>;
  tok: Set<string>;
}

export interface CostBreakdown {
  total: number;
  trade: number;
  chained: boolean;
}

export interface ScoreBreakdown {
  military: number;
  blue: number;
  green: number;
  yellow: number;
  guild: number;
  wonders: number;
  tokens: number;
  coins: number;
  total: number;
}

/* ============================================================
   CARD DATA
   Reconstructed by hand. Everything the engine needs lives here,
   so any card that doesn't match your physical copy is a one-line
   fix. Proofread this block against the real cards before your
   first serious game.
   cost: coins + resources.  chainFrom: id of card that makes this free.
   ============================================================ */
type CardExtra = Omit<Partial<Card>, "id" | "name" | "age" | "color" | "cost">;

const c = (
  id: string,
  name: string,
  age: number,
  color: CardColor,
  cost: Cost,
  extra: CardExtra = {},
): Card => ({
  id, name, age, color, cost, vp: 0, shields: 0, ...extra,
});

const CARDS: Card[] = [
  /* ---------- AGE I ---------- */
  c("lumber_yard", "Lumber Yard", 1, "brown", {}, { prod: { wood: 1 } }),
  c("logging_camp", "Logging Camp", 1, "brown", { coins: 1 }, { prod: { wood: 1 } }),
  c("clay_pool", "Clay Pool", 1, "brown", {}, { prod: { clay: 1 } }),
  c("clay_pit", "Clay Pit", 1, "brown", { coins: 1 }, { prod: { clay: 1 } }),
  c("quarry", "Quarry", 1, "brown", { coins: 1 }, { prod: { stone: 1 } }),
  c("stone_pit", "Stone Pit", 1, "brown", {}, { prod: { stone: 1 } }),
  c("glassworks", "Glassworks", 1, "grey", { coins: 1 }, { prod: { glass: 1 } }),
  c("press", "Press", 1, "grey", { coins: 1 }, { prod: { papyrus: 1 } }),
  c("tavern", "Tavern", 1, "yellow", {}, { gainCoins: 4 }),
  c("stone_reserve", "Stone Reserve", 1, "yellow", { coins: 3 }, { fixTrade: ["stone"] }),
  c("clay_reserve", "Clay Reserve", 1, "yellow", { coins: 3 }, { fixTrade: ["clay"] }),
  c("wood_reserve", "Wood Reserve", 1, "yellow", { coins: 3 }, { fixTrade: ["wood"] }),
  c("altar", "Altar", 1, "blue", {}, { vp: 3 }),
  c("baths", "Baths", 1, "blue", { stone: 1 }, { vp: 3 }),
  c("theater", "Theater", 1, "blue", {}, { vp: 3 }),
  c("palisade", "Palisade", 1, "red", { coins: 2 }, { shields: 1 }),
  c("garrison", "Garrison", 1, "red", { clay: 1 }, { shields: 1 }),
  c("guard_tower", "Guard Tower", 1, "red", {}, { shields: 1 }),
  c("stable", "Stable", 1, "red", { wood: 1 }, { shields: 1 }),
  c("apothecary", "Apothecary", 1, "green", { glass: 1 }, { sci: "wheel", vp: 1 }),
  c("workshop", "Workshop", 1, "green", { papyrus: 1 }, { sci: "plumb", vp: 1 }),
  c("scriptorium", "Scriptorium", 1, "green", { coins: 2 }, { sci: "law" }),
  c("pharmacist", "Pharmacist", 1, "green", { coins: 2 }, { sci: "mortar" }),

  /* ---------- AGE II ---------- */
  c("sawmill", "Sawmill", 2, "brown", { coins: 2 }, { prod: { wood: 2 } }),
  c("brickyard", "Brickyard", 2, "brown", { coins: 2 }, { prod: { clay: 2 } }),
  c("shelf_quarry", "Shelf Quarry", 2, "brown", { coins: 2 }, { prod: { stone: 2 } }),
  c("glassblower", "Glassblower", 2, "grey", {}, { prod: { glass: 1 } }),
  c("drying_room", "Drying Room", 2, "grey", {}, { prod: { papyrus: 1 } }),
  c("forum", "Forum", 2, "yellow", { coins: 3, clay: 1 }, { prodChoice: ["glass", "papyrus"] }),
  c("caravansery", "Caravansery", 2, "yellow", { coins: 2, glass: 1, papyrus: 1 }, { prodChoice: ["wood", "clay", "stone"] }),
  c("customs_house", "Customs House", 2, "yellow", { coins: 4 }, { fixTrade: ["glass", "papyrus"] }),
  c("brewery", "Brewery", 2, "yellow", {}, { gainCoins: 6 }),
  c("aqueduct", "Aqueduct", 2, "blue", { stone: 3 }, { vp: 5, chainFrom: "baths" }),
  c("temple", "Temple", 2, "blue", { wood: 1, papyrus: 1 }, { vp: 4, chainFrom: "altar" }),
  c("statue", "Statue", 2, "blue", { wood: 1, clay: 2 }, { vp: 4, chainFrom: "theater" }),
  c("rostrum", "Rostrum", 2, "blue", { stone: 1, wood: 1 }, { vp: 4 }),
  c("courthouse", "Courthouse", 2, "blue", { wood: 2, glass: 1 }, { vp: 5 }),
  c("walls", "Walls", 2, "red", { stone: 3 }, { shields: 2 }),
  c("horse_breeders", "Horse Breeders", 2, "red", { clay: 1, wood: 1 }, { shields: 1, chainFrom: "stable" }),
  c("barracks", "Barracks", 2, "red", { coins: 3 }, { shields: 1, chainFrom: "garrison" }),
  c("archery_range", "Archery Range", 2, "red", { wood: 2, stone: 1, papyrus: 1 }, { shields: 2 }),
  c("fort", "Fort", 2, "red", { coins: 2, stone: 1 }, { shields: 1 }),
  c("dispensary", "Dispensary", 2, "green", { clay: 2, stone: 1 }, { sci: "mortar", vp: 2, chainFrom: "pharmacist" }),
  c("laboratory", "Laboratory", 2, "green", { papyrus: 2, wood: 1 }, { sci: "plumb", vp: 1, chainFrom: "workshop" }),
  c("library", "Library", 2, "green", { wood: 3, glass: 1 }, { sci: "law", vp: 2, chainFrom: "scriptorium" }),
  c("school", "School", 2, "green", { wood: 1, papyrus: 2 }, { sci: "wheel", vp: 1, chainFrom: "apothecary" }),

  /* ---------- AGE III ---------- */
  c("pantheon", "Pantheon", 3, "blue", { clay: 2, wood: 1, papyrus: 1, glass: 1 }, { vp: 7, chainFrom: "temple" }),
  c("gardens", "Gardens", 3, "blue", { clay: 2, wood: 2 }, { vp: 6, chainFrom: "statue" }),
  c("senate", "Senate", 3, "blue", { stone: 2, papyrus: 1, wood: 1 }, { vp: 5, chainFrom: "rostrum" }),
  c("town_hall", "Town Hall", 3, "blue", { stone: 3, wood: 2 }, { vp: 7 }),
  c("obelisk", "Obelisk", 3, "blue", { stone: 2, glass: 1 }, { vp: 5 }),
  c("palace", "Palace", 3, "blue", { clay: 1, stone: 1, wood: 1, glass: 2 }, { vp: 7 }),
  c("sanctuary", "Sanctuary", 3, "blue", { clay: 2, glass: 1 }, { vp: 5 }),
  c("academy", "Academy", 3, "green", { stone: 1, wood: 1, glass: 2 }, { sci: "sundial", vp: 3 }),
  c("study", "Study", 3, "green", { wood: 2, glass: 1, papyrus: 1 }, { sci: "sundial", vp: 3 }),
  c("university", "University", 3, "green", { clay: 1, glass: 1, papyrus: 1 }, { sci: "scales", vp: 2, chainFrom: "school" }),
  c("observatory", "Observatory", 3, "green", { stone: 1, papyrus: 2 }, { sci: "astrolabe", vp: 2, chainFrom: "laboratory" }),
  c("chamber_of_commerce", "Chamber of Commerce", 3, "yellow", { papyrus: 2 }, { vp: 3, coinsPer: { colors: ["grey"], n: 3 } }),
  c("port", "Port", 3, "yellow", { wood: 1, glass: 1, papyrus: 1 }, { vp: 3, coinsPer: { colors: ["brown"], n: 2 } }),
  c("armory", "Armory", 3, "yellow", { stone: 2, glass: 1 }, { vp: 3, coinsPer: { colors: ["grey"], n: 1 } }),
  c("arena", "Arena", 3, "yellow", { clay: 1, stone: 1, wood: 1 }, { vp: 3, coinsPerWonder: 2, chainFrom: "dispensary" }),
  c("lighthouse", "Lighthouse", 3, "yellow", { stone: 1, glass: 1, papyrus: 1 }, { vp: 3, coinsPer: { colors: ["yellow"], n: 1 } }),
  c("fortifications", "Fortifications", 3, "red", { stone: 2, clay: 1, papyrus: 1 }, { shields: 2, chainFrom: "palisade" }),
  c("siege_workshop", "Siege Workshop", 3, "red", { wood: 3, glass: 1 }, { shields: 2, chainFrom: "archery_range" }),
  c("circus", "Circus", 3, "red", { clay: 2, stone: 2 }, { shields: 2, chainFrom: "walls" }),
  c("arsenal", "Arsenal", 3, "red", { clay: 3, papyrus: 1 }, { shields: 3 }),

  /* ---------- GUILDS ---------- */
  c("magistrates_guild", "Magistrates Guild", 0, "purple", { wood: 3, clay: 1, glass: 1 }, { guild: { colors: ["blue"], coin: 1, vp: 1 } }),
  c("scientists_guild", "Scientists Guild", 0, "purple", { wood: 2, clay: 2, papyrus: 1 }, { guild: { colors: ["green"], coin: 1, vp: 1 } }),
  c("tacticians_guild", "Tacticians Guild", 0, "purple", { stone: 2, clay: 1, papyrus: 1 }, { guild: { colors: ["red"], coin: 1, vp: 1 } }),
  c("traders_guild", "Traders Guild", 0, "purple", { glass: 1, papyrus: 1 }, { guild: { colors: ["yellow"], coin: 1, vp: 1 } }),
  c("shipowners_guild", "Shipowners Guild", 0, "purple", { clay: 3, glass: 1, papyrus: 1 }, { guild: { colors: ["brown", "grey"], coin: 1, vp: 1 } }),
  c("builders_guild", "Builders Guild", 0, "purple", { stone: 2, clay: 1, glass: 2 }, { guild: { wonders: true, vp: 2 } }),
  c("moneylenders_guild", "Moneylenders Guild", 0, "purple", { stone: 2, wood: 2 }, { guild: { treasury: true } }),
];
const CARD: Record<string, Card> = Object.fromEntries(CARDS.map((x) => [x.id, x]));

/* ============================================================
   WONDERS
   ============================================================ */
const WONDERS: Wonder[] = [
  { id: "appian_way", name: "The Appian Way", cost: { clay: 2, stone: 2, papyrus: 1 }, vp: 3, gainCoins: 3, oppLoses: 3, again: true, text: "+3 coins, opponent −3, play again" },
  { id: "circus_maximus", name: "Circus Maximus", cost: { stone: 2, wood: 1, glass: 1 }, vp: 3, shields: 1, destroy: "grey", text: "Destroy an opponent's grey card. 1 shield" },
  { id: "colossus", name: "The Colossus", cost: { clay: 3, glass: 1 }, vp: 3, shields: 2, text: "2 shields" },
  { id: "great_library", name: "The Great Library", cost: { wood: 3, glass: 1, papyrus: 1 }, vp: 4, library: true, text: "Draw 3 unused progress tokens, keep 1" },
  { id: "great_lighthouse", name: "The Great Lighthouse", cost: { wood: 2, stone: 1, papyrus: 1 }, vp: 4, prodChoice: ["wood", "clay", "stone"], text: "Produces wood / clay / stone each turn" },
  { id: "hanging_gardens", name: "The Hanging Gardens", cost: { wood: 2, glass: 1, papyrus: 1 }, vp: 3, gainCoins: 6, again: true, text: "+6 coins, play again" },
  { id: "mausoleum", name: "The Mausoleum", cost: { clay: 2, glass: 2 }, vp: 2, mausoleum: true, text: "Build any discarded card for free" },
  { id: "piraeus", name: "Piraeus", cost: { wood: 2, stone: 1, clay: 1 }, vp: 2, prodChoice: ["glass", "papyrus"], again: true, text: "Produces glass / papyrus each turn, play again" },
  { id: "pyramids", name: "The Pyramids", cost: { stone: 3, papyrus: 1 }, vp: 9, text: "9 victory points" },
  { id: "sphinx", name: "The Sphinx", cost: { stone: 1, clay: 1, glass: 2 }, vp: 6, again: true, text: "Play again" },
  { id: "statue_of_zeus", name: "The Statue of Zeus", cost: { wood: 1, stone: 1, clay: 1, papyrus: 2 }, vp: 3, shields: 1, destroy: "brown", text: "Destroy an opponent's brown card. 1 shield" },
  { id: "temple_of_artemis", name: "The Temple of Artemis", cost: { wood: 1, stone: 1, glass: 1, papyrus: 1 }, vp: 0, gainCoins: 12, again: true, text: "+12 coins, play again" },
];
const WON: Record<string, Wonder> = Object.fromEntries(WONDERS.map((w) => [w.id, w]));

/* ============================================================
   PROGRESS TOKENS
   ============================================================ */
const TOKENS: ProgressToken[] = [
  { id: "agriculture", name: "Agriculture", text: "+6 coins now. Worth 4 VP.", coins: 6, vp: 4 },
  { id: "architecture", name: "Architecture", text: "Your future Wonders cost 2 fewer resources." },
  { id: "economy", name: "Economy", text: "You receive the coins your opponent spends on trade." },
  { id: "law", name: "Law", text: "Counts as a scientific symbol.", sci: "law" },
  { id: "masonry", name: "Masonry", text: "Your future blue cards cost 2 fewer resources." },
  { id: "mathematics", name: "Mathematics", text: "3 VP per progress token you hold." },
  { id: "philosophy", name: "Philosophy", text: "Worth 7 VP.", vp: 7 },
  { id: "strategy", name: "Strategy", text: "Red cards you build from now on give 1 extra shield." },
  { id: "theology", name: "Theology", text: "Your future Wonders all gain play again." },
  { id: "urbanism", name: "Urbanism", text: "+6 coins now. +4 coins each time you chain a card free.", coins: 6 },
];
const TOK: Record<string, ProgressToken> = Object.fromEntries(TOKENS.map((t) => [t.id, t]));

/* ============================================================
   STRUCTURE LAYOUTS
   Lower rows sit on top of higher rows, so the bottom row is the
   first thing you can take. `up` lists the face-up row indices.
   ============================================================ */
const LAYOUTS: Record<Age, { rows: number[]; up: number[] }> = {
  1: { rows: [2, 3, 4, 5, 6], up: [0, 2, 4] },
  2: { rows: [6, 5, 4, 3, 2], up: [0, 2, 4] },
  3: { rows: [2, 3, 4, 2, 4, 3, 2], up: [0, 2, 4, 6] },
};

function buildSlots(age: Age): Slot[] {
  const { rows, up } = LAYOUTS[age];
  const slots: Slot[] = [];
  const idx: number[][] = [];
  let n = 0;
  rows.forEach((len, r) => {
    const ids: number[] = [];
    for (let i = 0; i < len; i++) {
      ids.push(n);
      slots.push({ id: n, row: r, col: i, card: null, up: up.includes(r), coveredBy: [] });
      n++;
    }
    idx.push(ids);
  });
  const cover = (upperRow: number, i: number, lowerIds: (number | undefined)[]) => {
    lowerIds.forEach((lid) => {
      if (lid !== undefined) slots[idx[upperRow][i]].coveredBy.push(lid);
    });
  };
  for (let r = 0; r < rows.length - 1; r++) {
    const a = rows[r], b = rows[r + 1];
    for (let i = 0; i < a; i++) {
      if (b === a + 1) cover(r, i, [idx[r + 1][i], idx[r + 1][i + 1]]);
      else if (b === a - 1) cover(r, i, [idx[r + 1][i - 1], idx[r + 1][i]]);
      else if (b === a / 2) cover(r, i, [idx[r + 1][Math.floor(i / 2)]]);
      else if (b === a * 2) cover(r, i, [idx[r + 1][i * 2], idx[r + 1][i * 2 + 1]]);
    }
  }
  return slots;
}

const isOpen = (slots: Slot[], s: Slot): boolean =>
  s.card !== null && s.coveredBy.every((id) => slots[id].card === null);

function refresh(slots: Slot[]): Slot[] {
  slots.forEach((s) => { if (isOpen(slots, s)) s.up = true; });
  return slots;
}

/* ============================================================
   DERIVED PLAYER STATE
   ============================================================ */
function view(st: GameState, i: number): PlayerView {
  const p = st.players[i];
  const cards = p.built.map((id) => CARD[id]);
  const wonders = p.wonders.filter((w) => w.built).map((w) => WON[w.id]);
  const toks = p.tokens.map((t) => TOK[t]);

  const prod: Production = {};
  const choices: Resource[][] = [];
  cards.forEach((k) => {
    const kp = k.prod;
    if (kp) (Object.keys(kp) as Resource[]).forEach((r) => { prod[r] = (prod[r] || 0) + (kp[r] || 0); });
    if (k.prodChoice) choices.push(k.prodChoice);
  });
  wonders.forEach((w) => { if (w.prodChoice) choices.push(w.prodChoice); });

  const brownGrey: Production = {};
  cards.forEach((k) => {
    const kp = k.prod;
    if ((k.color === "brown" || k.color === "grey") && kp)
      (Object.keys(kp) as Resource[]).forEach((r) => { brownGrey[r] = (brownGrey[r] || 0) + (kp[r] || 0); });
  });

  const fixTrade = new Set<Resource>();
  cards.forEach((k) => {
    if (k.fixTrade) k.fixTrade.forEach((r) => { fixTrade.add(r); });
  });

  let shields = 0;
  cards.forEach((k) => { shields += k.shields || 0; });
  wonders.forEach((w) => { shields += w.shields || 0; });

  const sci: Partial<Record<ScienceSymbol, number>> = {};
  cards.forEach((k) => { if (k.sci) sci[k.sci] = (sci[k.sci] || 0) + 1; });
  toks.forEach((t) => { if (t.sci) sci[t.sci] = (sci[t.sci] || 0) + 1; });

  const has = new Set(p.built);
  const tok = new Set(p.tokens);
  return { p, cards, wonders, prod, choices, brownGrey, fixTrade, shields, sci, has, tok };
}

const cartesian = <T,>(arrs: T[][]): T[][] =>
  arrs.reduce<T[][]>((acc, opts) => acc.flatMap((a) => opts.map((o) => [...a, o])), [[]]);

function price(me: PlayerView, opp: PlayerView, r: Resource): number {
  if (me.fixTrade.has(r)) return 1;
  return 2 + (opp.brownGrey[r] || 0);
}

/* Cheapest coin cost to cover a resource requirement, choosing the best
   assignment for flexible producers and waiving the priciest units. */
function resourceCost(me: PlayerView, opp: PlayerView, need: Cost, waivers: number): number {
  let best = Infinity;
  for (const assign of cartesian(me.choices)) {
    const prod = { ...me.prod };
    assign.forEach((r) => { prod[r] = (prod[r] || 0) + 1; });
    let units: Resource[] = [];
    RES.forEach((r) => {
      const short = Math.max(0, (need[r] || 0) - (prod[r] || 0));
      for (let k = 0; k < short; k++) units.push(r);
    });
    units.sort((a, b) => price(me, opp, b) - price(me, opp, a));
    units = units.slice(waivers);
    best = Math.min(best, units.reduce((s, r) => s + price(me, opp, r), 0));
    if (best === 0) break;
  }
  return best === Infinity ? 0 : best;
}

/* Returns { total, trade, chained } for building a card. */
function cardCost(st: GameState, i: number, card: Card): CostBreakdown {
  const me = view(st, i), opp = view(st, 1 - i);
  if (card.chainFrom && me.has.has(card.chainFrom)) return { total: 0, trade: 0, chained: true };
  const waivers = card.color === "blue" && me.tok.has("masonry") ? 2 : 0;
  const trade = resourceCost(me, opp, card.cost, waivers);
  return { total: trade + (card.cost.coins || 0), trade, chained: false };
}

function wonderCost(st: GameState, i: number, w: Wonder): CostBreakdown {
  const me = view(st, i), opp = view(st, 1 - i);
  const waivers = me.tok.has("architecture") ? 2 : 0;
  const trade = resourceCost(me, opp, w.cost, waivers);
  return { total: trade, trade, chained: false };
}

/* ============================================================
   SETUP
   ============================================================ */
const shuffle = <T,>(a: readonly T[]): T[] => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

function ageDeck(age: number): string[] {
  if (age < 3) return shuffle(CARDS.filter((k) => k.age === age).map((k) => k.id));
  const guilds = shuffle(CARDS.filter((k) => k.color === "purple").map((k) => k.id)).slice(0, 3);
  return shuffle([...CARDS.filter((k) => k.age === 3).map((k) => k.id), ...guilds]);
}

/* Lazy dealing: slots start empty and draw at reveal time, so no
   future card order exists anywhere to be peeked at. */
const draw = (st: GameState): string => st.deck.splice(Math.floor(Math.random() * st.deck.length), 1)[0];

function dealAge(st: GameState, age: Age): void {
  st.age = age;
  st.deck = ageDeck(age);
  st.slots = buildSlots(age);
  /* Face-up rows are public, so deal them now — you can see a face-up card
     even while it's still covered. Face-down rows stay undetermined and are
     drawn at the moment they're uncovered, so no future order exists to peek at. */
  st.slots.forEach((s) => { s.card = s.up ? draw(st) : "?"; });
  st.remaining = st.slots.length;
  materialise(st);
}

function materialise(st: GameState): void {
  let again = true;
  while (again) {
    again = false;
    st.slots.forEach((s) => {
      if (s.card === "?" && isOpen(st.slots, s)) {
        s.card = draw(st);
        s.up = true;
        again = true;
      }
    });
  }
}

function newGame(names: string[]): GameState {
  const st: GameState = {
    phase: "draft",
    names,
    players: [0, 1].map(() => ({ coins: 7, built: [], wonders: [], tokens: [] })),
    conflict: 0,
    loot: { p0_2: true, p0_5: true, p1_2: true, p1_5: true },
    board: [], box: [],
    discard: [],
    wondersBuilt: 0,
    turn: 0,
    first: Math.random() < 0.5 ? 0 : 1,
    pending: null,
    winner: null,
    log: [],
    draftPool: [], draftStep: 0, draftAll: [],
    slots: [], deck: [], age: 1, remaining: 0,
  };
  const toks = shuffle(TOKENS.map((t) => t.id));
  st.board = toks.slice(0, 5);
  st.box = toks.slice(5);
  st.draftAll = shuffle(WONDERS.map((w) => w.id));
  st.draftPool = st.draftAll.slice(0, 4);
  st.turn = st.first;
  return st;
}

const DRAFT = [0, 1, 1, 0, 1, 0, 0, 1];

function draftPick(st: GameState, id: string): GameState {
  const seat = (DRAFT[st.draftStep] + st.first) % 2;
  st.players[seat].wonders.push({ id, built: false });
  st.draftPool = st.draftPool.filter((x) => x !== id);
  st.draftStep++;
  if (st.draftStep === 4) st.draftPool = st.draftAll.slice(4, 8);
  if (st.draftStep === 8) {
    st.phase = "play";
    st.turn = st.first;
    dealAge(st, 1);
    st.log.push("Age I begins.");
  }
  return st;
}

/* ============================================================
   ENGINE
   ============================================================ */
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

/* Economy captures only what was spent on trade, never a card's printed coin cost. */
function pay(st: GameState, i: number, total: number, trade: number): void {
  st.players[i].coins = Math.max(0, st.players[i].coins - total);
  if (trade > 0 && view(st, 1 - i).tok.has("economy")) st.players[1 - i].coins += trade;
}

function addShields(st: GameState, i: number, n: number): void {
  if (n <= 0) return;
  const dir = i === 0 ? 1 : -1;
  st.conflict = Math.max(-9, Math.min(9, st.conflict + n * dir));
  const cf = st.conflict;
  if (cf >= 3 && st.loot.p1_2) { st.loot.p1_2 = false; st.players[1].coins = Math.max(0, st.players[1].coins - 2); }
  if (cf >= 6 && st.loot.p1_5) { st.loot.p1_5 = false; st.players[1].coins = Math.max(0, st.players[1].coins - 5); }
  if (cf <= -3 && st.loot.p0_2) { st.loot.p0_2 = false; st.players[0].coins = Math.max(0, st.players[0].coins - 2); }
  if (cf <= -6 && st.loot.p0_5) { st.loot.p0_5 = false; st.players[0].coins = Math.max(0, st.players[0].coins - 5); }
  if (cf >= 9) st.winner = { p: 0, by: "military" };
  if (cf <= -9) st.winner = { p: 1, by: "military" };
}

/* Grant a token pick if the newly gained symbol completed a pair. */
function maybePair(st: GameState, i: number, symbol: ScienceSymbol | undefined): void {
  if (!symbol) return;
  const v = view(st, i);
  if (v.sci[symbol] === 2 && st.board.length) {
    st.pending = { type: "progress", player: i };
  }
  if (Object.keys(v.sci).length >= 6) st.winner = { p: i, by: "science" };
}

function applyCardEffects(st: GameState, i: number, card: Card, chained: boolean): void {
  const me = view(st, i);
  if (card.gainCoins) st.players[i].coins += card.gainCoins;
  const cp = card.coinsPer;
  if (cp) {
    const n = Math.max(
      ...[0, 1].map((j) => st.players[j].built.filter((id) => cp.colors.includes(CARD[id].color)).length)
    );
    st.players[i].coins += n * cp.n;
  }
  if (card.coinsPerWonder) {
    const n = Math.max(...[0, 1].map((j) => st.players[j].wonders.filter((w) => w.built).length));
    st.players[i].coins += n * card.coinsPerWonder;
  }
  const gd = card.guild;
  if (gd && gd.coin) {
    const n = Math.max(
      ...[0, 1].map((j) => st.players[j].built.filter((id) => (gd.colors ?? []).includes(CARD[id].color)).length)
    );
    st.players[i].coins += n * gd.coin;
  }
  let sh = card.shields || 0;
  if (sh && me.tok.has("strategy")) sh += 1;
  addShields(st, i, sh);
  if (chained && me.tok.has("urbanism")) st.players[i].coins += 4;
  maybePair(st, i, card.sci);
}

function takeSlot(st: GameState, slotId: number): void {
  const s = st.slots.find((x) => x.id === slotId)!;
  s.card = null;
  st.remaining--;
  materialise(st);
}

function endTurn(st: GameState, again: boolean): GameState {
  if (st.winner) { st.phase = "over"; return st; }
  if (st.pending) return st;
  if (st.remaining === 0) {
    if (st.age === 3) { st.phase = "over"; st.winner = finalWinner(st); return st; }
    const behind = st.conflict > 0 ? 1 : st.conflict < 0 ? 0 : st.turn;
    st.pending = { type: "first", player: behind, next: (st.age + 1) as Age };
    return st;
  }
  if (!again) st.turn = 1 - st.turn;
  return st;
}

function actBuild(st: GameState, slotId: number): GameState | null {
  const i = st.turn;
  const s = st.slots.find((x) => x.id === slotId)!;
  const card = CARD[s.card!];
  const cost = cardCost(st, i, card);
  if (cost.total > st.players[i].coins) return null;
  st = clone(st);
  pay(st, i, cost.total, cost.trade);
  st.players[i].built.push(card.id);
  takeSlot(st, slotId);
  applyCardEffects(st, i, card, cost.chained);
  st.log.push(`${st.names[i]} built ${card.name}${cost.chained ? " (chained free)" : cost.total ? ` for ${cost.total}c` : ""}.`);
  return endTurn(st, false);
}

function actDiscard(st: GameState, slotId: number): GameState {
  const i = st.turn;
  st = clone(st);
  const s = st.slots.find((x) => x.id === slotId)!;
  const card = CARD[s.card!];
  const yellow = st.players[i].built.filter((id) => CARD[id].color === "yellow").length;
  st.players[i].coins += 2 + yellow;
  st.discard.push(card.id);
  takeSlot(st, slotId);
  st.log.push(`${st.names[i]} discarded ${card.name} for ${2 + yellow}c.`);
  return endTurn(st, false);
}

function actWonder(st: GameState, slotId: number, wonderId: string): GameState | null {
  const i = st.turn;
  const w = WON[wonderId];
  const cost = wonderCost(st, i, w);
  if (cost.total > st.players[i].coins) return null;
  st = clone(st);
  pay(st, i, cost.total, cost.trade);
  const slot = st.players[i].wonders.find((x) => x.id === wonderId)!;
  slot.built = true;
  st.wondersBuilt++;
  takeSlot(st, slotId);

  const me = view(st, i);
  if (w.gainCoins) st.players[i].coins += w.gainCoins;
  if (w.oppLoses) st.players[1 - i].coins = Math.max(0, st.players[1 - i].coins - w.oppLoses);
  addShields(st, i, w.shields || 0);
  st.log.push(`${st.names[i]} built ${w.name}.`);

  if (st.wondersBuilt === 7) {
    [0, 1].forEach((j) => { st.players[j].wonders = st.players[j].wonders.filter((x) => x.built); });
    st.log.push("Seven Wonders stand. The rest are gone.");
  }

  const again = w.again || me.tok.has("theology");
  if (st.winner) { st.phase = "over"; return st; }

  if (w.destroy) {
    const targets = st.players[1 - i].built.filter((id) => CARD[id].color === w.destroy);
    if (targets.length) { st.pending = { type: "destroy", player: i, color: w.destroy, again }; return st; }
  }
  if (w.library && st.box.length) {
    st.pending = { type: "library", player: i, options: shuffle(st.box).slice(0, 3), again };
    return st;
  }
  if (w.mausoleum && st.discard.length) {
    st.pending = { type: "mausoleum", player: i, again };
    return st;
  }
  return endTurn(st, again && st.remaining > 0);
}

function resolve(st: GameState, choice: string | number): GameState {
  st = clone(st);
  const pd = st.pending!;
  const i = pd.player;
  st.pending = null;

  if (pd.type === "progress") {
    const token = choice as string;
    st.board = st.board.filter((t) => t !== token);
    st.players[i].tokens.push(token);
    const t = TOK[token];
    if (t.coins) st.players[i].coins += t.coins;
    st.log.push(`${st.names[i]} took ${t.name}.`);
    if (t.sci) maybePair(st, i, t.sci);
    if (st.pending) return st;
    return endTurn(st, false);
  }
  if (pd.type === "destroy") {
    const cardId = choice as string;
    const arr = st.players[1 - i].built;
    arr.splice(arr.indexOf(cardId), 1);
    st.discard.push(cardId);
    st.log.push(`${st.names[i]} destroyed ${CARD[cardId].name}.`);
    return endTurn(st, pd.again && st.remaining > 0);
  }
  if (pd.type === "library") {
    const token = choice as string;
    st.box = st.box.filter((t) => t !== token);
    st.players[i].tokens.push(token);
    const t = TOK[token];
    if (t.coins) st.players[i].coins += t.coins;
    st.log.push(`${st.names[i]} took ${t.name} from the archive.`);
    if (t.sci) maybePair(st, i, t.sci);
    if (st.pending) return st;
    return endTurn(st, pd.again && st.remaining > 0);
  }
  if (pd.type === "mausoleum") {
    const cardId = choice as string;
    st.discard.splice(st.discard.indexOf(cardId), 1);
    st.players[i].built.push(cardId);
    applyCardEffects(st, i, CARD[cardId], false);
    st.log.push(`${st.names[i]} raised ${CARD[cardId].name} from the discard.`);
    if (st.pending) return st;
    return endTurn(st, pd.again && st.remaining > 0);
  }
  if (pd.type === "first") {
    const seat = choice as number;
    st.turn = seat;
    dealAge(st, pd.next);
    st.log.push(`Age ${["", "I", "II", "III"][pd.next]} begins. ${st.names[seat]} starts.`);
    return st;
  }
  return st;
}

/* ============================================================
   SCORING
   ============================================================ */
const milVP = (d: number): number => (d === 0 ? 0 : d <= 2 ? 2 : d <= 5 ? 5 : 10);

function score(st: GameState, i: number): ScoreBreakdown {
  const v = view(st, i);
  const b: Omit<ScoreBreakdown, "total"> = { military: 0, blue: 0, green: 0, yellow: 0, guild: 0, wonders: 0, tokens: 0, coins: 0 };
  const d = st.conflict;
  if ((i === 0 && d > 0) || (i === 1 && d < 0)) b.military = milVP(Math.abs(d));
  v.cards.forEach((k) => {
    if (k.color === "blue") b.blue += k.vp || 0;
    else if (k.color === "green") b.green += k.vp || 0;
    else if (k.color === "yellow") b.yellow += k.vp || 0;
    else if (k.color === "purple") {
      const g = k.guild!;
      if (g.treasury) b.guild += Math.floor(Math.max(st.players[0].coins, st.players[1].coins) / 3);
      else if (g.wonders) b.guild += (g.vp ?? 0) * Math.max(...[0, 1].map((j) => st.players[j].wonders.filter((w) => w.built).length));
      else b.guild += (g.vp ?? 0) * Math.max(...[0, 1].map((j) => st.players[j].built.filter((id) => (g.colors ?? []).includes(CARD[id].color)).length));
    }
  });
  v.wonders.forEach((w) => { b.wonders += w.vp || 0; });
  v.p.tokens.forEach((t) => { b.tokens += TOK[t].vp || 0; });
  if (v.tok.has("mathematics")) b.tokens += 3 * v.p.tokens.length;
  b.coins = Math.floor(v.p.coins / 3);
  return { ...b, total: Object.values(b).reduce((a, x) => a + x, 0) };
}

function finalWinner(st: GameState): Winner {
  const a = score(st, 0), b = score(st, 1);
  if (a.total !== b.total) return { p: a.total > b.total ? 0 : 1, by: "points" };
  if (a.blue !== b.blue) return { p: a.blue > b.blue ? 0 : 1, by: "tiebreak" };
  return { p: null, by: "draw" };
}

export {
  CARDS, CARD, WONDERS, WON, TOKENS, TOK, LAYOUTS, buildSlots, isOpen, refresh, view, resourceCost, cardCost, wonderCost, shuffle, ageDeck, dealAge, newGame, DRAFT, draftPick, clone, addShields, endTurn, actBuild, actDiscard, actWonder, resolve, milVP, score, finalWinner,
};
