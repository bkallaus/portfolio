import { GEMS } from "./theme.ts";
import type { GemColor, TokenKind } from "./theme.ts";

export type Ability = "gem" | "anyGem" | "steal" | "privilege" | "again";

export type Cost = Partial<Record<Exclude<TokenKind, "gold">, number>>;

export interface Card {
  id: string;
  tier: 1 | 2 | 3;
  color: GemColor | null;
  cost: Cost;
  points: number;
  crowns: number;
  bonus: number;
  wildBonus: boolean;
  ability: Ability | null;
}

export interface Royal {
  id: string;
  name: string;
  points: number;
  ability: Ability | null;
  text: string;
}

const ABILITY_TEXT: Record<Ability, string> = {
  gem: "Take 1 token of this card's colour from the board.",
  anyGem: "Take 1 token of your choice from the board.",
  steal: "Take 1 token from your opponent's reserve.",
  privilege: "Take 1 privilege.",
  again: "Take another turn.",
};

export const abilityText = (ability: Ability): string => ABILITY_TEXT[ability];

interface Spec {
  cost: Cost;
  points?: number;
  crowns?: number;
  bonus?: number;
  wildBonus?: boolean;
  ability?: Ability;
}

const build = (id: string, tier: 1 | 2 | 3, color: GemColor | null, spec: Spec): Card => ({
  id,
  tier,
  color,
  cost: spec.cost,
  points: spec.points ?? 0,
  crowns: spec.crowns ?? 0,
  bonus: spec.bonus ?? 0,
  wildBonus: spec.wildBonus ?? false,
  ability: spec.ability ?? null,
});

const rotation = (color: GemColor): GemColor[] => {
  const at = GEMS.indexOf(color);
  return [1, 2, 3, 4].map((step) => GEMS[(at + step) % GEMS.length]);
};

const PRESSING_ABILITY: Record<GemColor, Ability> = {
  quartz: "privilege",
  azurite: "again",
  verdite: "privilege",
  garnet: "again",
  obsidian: "privilege",
};

function tierOneFor(color: GemColor): Card[] {
  const [near, second, third, far] = rotation(color);
  return [
    build(`${color}-1a`, 1, color, { cost: { [near]: 2 }, bonus: 1, ability: "gem" }),
    build(`${color}-1b`, 1, color, {
      cost: { [second]: 1, [third]: 1, [far]: 1 },
      bonus: 1,
      ability: PRESSING_ABILITY[color],
    }),
    build(`${color}-1c`, 1, color, { cost: { [third]: 3 }, bonus: 1, crowns: 1 }),
    build(`${color}-1d`, 1, color, { cost: { [second]: 2, [far]: 2 }, bonus: 2 }),
    build(`${color}-1e`, 1, color, { cost: { [far]: 1, pearl: 1 }, bonus: 1, ability: "steal" }),
    build(`${color}-1f`, 1, color, { cost: { [near]: 4 }, bonus: 1, points: 1 }),
  ];
}

function tierTwoFor(color: GemColor): Card[] {
  const [near, second, third, far] = rotation(color);
  return [
    build(`${color}-2a`, 2, color, { cost: { [near]: 5 }, bonus: 2, points: 1, crowns: 1 }),
    build(`${color}-2b`, 2, color, {
      cost: { [second]: 3, [third]: 2, pearl: 1 },
      bonus: 1,
      points: 2,
      ability: "gem",
    }),
    build(`${color}-2c`, 2, color, {
      cost: { [near]: 2, [second]: 2, [far]: 2 },
      bonus: 2,
      crowns: 2,
    }),
    build(`${color}-2d`, 2, color, { cost: { [third]: 5 }, bonus: 1, points: 3 }),
  ];
}

function tierThreeFor(color: GemColor): Card[] {
  const [near, second, third] = rotation(color);
  return [
    build(`${color}-3a`, 3, color, {
      cost: { [near]: 6, pearl: 2 },
      bonus: 1,
      points: 4,
      crowns: 1,
    }),
    build(`${color}-3b`, 3, color, {
      cost: { [second]: 5, [third]: 3, pearl: 2 },
      bonus: 2,
      points: 5,
      crowns: 2,
    }),
  ];
}

const NEUTRAL_CARDS: Card[] = [
  build("neutral-2a", 2, null, {
    cost: { quartz: 2, verdite: 2, pearl: 1 },
    points: 2,
    crowns: 1,
    ability: "again",
  }),
  build("neutral-2b", 2, null, {
    cost: { azurite: 2, obsidian: 2, pearl: 1 },
    points: 2,
    crowns: 1,
    bonus: 1,
    wildBonus: true,
    ability: "privilege",
  }),
  build("neutral-2c", 2, null, {
    cost: { garnet: 3, pearl: 2 },
    points: 1,
    crowns: 2,
    ability: "steal",
  }),
  build("neutral-2d", 2, null, {
    cost: { verdite: 3, azurite: 2, pearl: 1 },
    points: 1,
    crowns: 1,
    bonus: 1,
    wildBonus: true,
  }),
  build("neutral-3a", 3, null, {
    cost: { quartz: 3, garnet: 3, pearl: 3 },
    points: 6,
    crowns: 1,
    ability: "again",
  }),
  build("neutral-3b", 3, null, { cost: { obsidian: 5, pearl: 3 }, points: 4, crowns: 3 }),
  build("neutral-3c", 3, null, {
    cost: { azurite: 3, verdite: 2, pearl: 3 },
    points: 3,
    crowns: 2,
    bonus: 2,
    wildBonus: true,
  }),
];

export const CARDS: Card[] = [
  ...GEMS.flatMap(tierOneFor),
  ...GEMS.flatMap(tierTwoFor),
  ...GEMS.flatMap(tierThreeFor),
  ...NEUTRAL_CARDS,
];

export const ROYALS: Royal[] = [
  {
    id: "royal-warden",
    name: "The Warden",
    points: 3,
    ability: "again",
    text: "Take another turn.",
  },
  {
    id: "royal-archivist",
    name: "The Archivist",
    points: 3,
    ability: "privilege",
    text: "Take 1 privilege.",
  },
  {
    id: "royal-magnate",
    name: "The Magnate",
    points: 2,
    ability: "steal",
    text: "Take 1 token from your opponent's reserve.",
  },
  {
    id: "royal-geologist",
    name: "The Geologist",
    points: 3,
    ability: "anyGem",
    text: "Take 1 token of your choice from the board.",
  },
];

const byId = new Map(CARDS.map((card) => [card.id, card]));
const royalById = new Map(ROYALS.map((royal) => [royal.id, royal]));

export const card = (id: string): Card => {
  const found = byId.get(id);
  if (!found) throw new Error(`unknown card ${id}`);
  return found;
};

export const royal = (id: string): Royal => {
  const found = royalById.get(id);
  if (!found) throw new Error(`unknown royal ${id}`);
  return found;
};

export const MARKET_WIDTH: Record<1 | 2 | 3, number> = { 1: 5, 2: 4, 3: 3 };

export const costTotal = (cost: Cost): number =>
  Object.values(cost).reduce((sum, n) => sum + (n ?? 0), 0);
