export type GemColor = "quartz" | "azurite" | "verdite" | "garnet" | "obsidian";
export type TokenKind = GemColor | "pearl" | "gold";

export const GEMS: readonly GemColor[] = ["quartz", "azurite", "verdite", "garnet", "obsidian"];
export const SPENDABLE: readonly TokenKind[] = [...GEMS, "pearl"];
export const ALL_TOKENS: readonly TokenKind[] = [...GEMS, "pearl", "gold"];

export const TOKEN_LABEL: Record<TokenKind, string> = {
  quartz: "Quartz",
  azurite: "Azurite",
  verdite: "Verdite",
  garnet: "Garnet",
  obsidian: "Obsidian",
  pearl: "Pearl",
  gold: "Gold",
};

export const TOKEN_COLOR: Record<TokenKind, string> = {
  quartz: "#e8e4da",
  azurite: "#4a7fc4",
  verdite: "#4f9d6a",
  garnet: "#b4433f",
  obsidian: "#3b3f47",
  pearl: "#d9c6d8",
  gold: "#d8a94a",
};

export const TOKEN_INK: Record<TokenKind, string> = {
  quartz: "#2b2b2b",
  azurite: "#eaf2ff",
  verdite: "#eefaf1",
  garnet: "#ffeceb",
  obsidian: "#e6e8ee",
  pearl: "#3a2f3a",
  gold: "#3a2a06",
};

export const TOKEN_GLYPH: Record<TokenKind, string> = {
  quartz: "Q",
  azurite: "A",
  verdite: "V",
  garnet: "G",
  obsidian: "O",
  pearl: "P",
  gold: "*",
};

export const NEUTRAL_CARD_COLOR = "#7d8694";

export const C = {
  table: "#141a22",
  panel: "#1c2530",
  panelLit: "#24303d",
  line: "#36465a",
  ink: "#eef1f6",
  muted: "#93a2b5",
  accent: "#d8a94a",
  danger: "#c9554c",
  good: "#57a877",
};

export const FONT = {
  display: "'Spectral', 'Iowan Old Style', Georgia, serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

export const G = {
  table: "radial-gradient(130% 95% at 50% -15%, #25313f 0%, #1a232e 45%, #10161d 100%)",
  panel: "linear-gradient(180deg, #222d3a 0%, #1a232e 100%)",
  panelLit: "linear-gradient(180deg, #2c3a4a 0%, #222e3b 100%)",
  card: "linear-gradient(172deg, #fbf8f1 0%, #f1ebdd 55%, #e3dbc9 100%)",
  cardBack: "linear-gradient(172deg, #3c4a5c 0%, #2a3442 100%)",
  accent: "linear-gradient(180deg, #e8c278 0%, #d8a94a 55%, #b98c35 100%)",
};

export const SHADOW = {
  card: "0 1px 2px rgba(0,0,0,.45), 0 5px 12px -4px rgba(0,0,0,.55)",
  cardUp: "0 2px 5px rgba(0,0,0,.45), 0 16px 28px -10px rgba(0,0,0,.7)",
  panel: "0 1px 0 rgba(255,255,255,.05) inset, 0 10px 24px -16px rgba(0,0,0,.9)",
  sunk: "0 2px 7px rgba(0,0,0,.45) inset",
};

export function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (offset: number) => {
    const raw = Math.round(((value >> offset) & 255) + 255 * (amount / 100));
    return Math.max(0, Math.min(255, raw)).toString(16).padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

export const tokenFill = (kind: TokenKind): string => {
  const base = TOKEN_COLOR[kind];
  return `radial-gradient(circle at 33% 27%, ${shade(base, 16)} 0%, ${base} 45%, ${shade(base, -32)} 100%)`;
};
