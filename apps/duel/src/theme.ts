/* ============================================================
   PALETTE
   The domain's closed vocabularies live here as unions, so a typo in
   a resource or symbol name is a compile error rather than a silent
   undefined at render time.
   ============================================================ */
export type Resource = "wood" | "clay" | "stone" | "glass" | "papyrus";
export type CardColor = "brown" | "grey" | "blue" | "green" | "yellow" | "red" | "purple";
export type ScienceSymbol = "wheel" | "plumb" | "mortar" | "law" | "sundial" | "scales" | "astrolabe";
export type SciShape = "circle" | "square" | "triangle" | "diamond" | "hex" | "cross" | "star";

export const C = {
  board: "#18262a",
  panel: "#20343a",
  panel2: "#2a4249",
  line: "#3a5960",
  ink: "#ece7d8",
  muted: "#8ea6ab",
  gold: "#d6a850",
  blood: "#b8453c",
};

export const CARDCOL: Record<CardColor, string> = {
  brown: "#8a5a35",
  grey: "#8d949a",
  blue: "#3f6fa8",
  green: "#4d8c5c",
  yellow: "#c9992f",
  red: "#a8433c",
  purple: "#7a5490",
};

export const RES: readonly Resource[] = ["wood", "clay", "stone", "glass", "papyrus"];
export const RESCOL: Record<Resource, string> = {
  wood: "#7a5230",
  clay: "#b5622f",
  stone: "#9aa0a4",
  glass: "#6fb6c8",
  papyrus: "#d9c47a",
};
export const RESLET: Record<Resource, string> = { wood: "W", clay: "C", stone: "S", glass: "G", papyrus: "P" };

/* Seven science symbols, drawn as distinct simple shapes. */
export const SCI: Record<ScienceSymbol, { col: string; shape: SciShape }> = {
  wheel: { col: "#e0b23c", shape: "circle" },
  plumb: { col: "#7fc2e8", shape: "triangle" },
  mortar: { col: "#d2705e", shape: "square" },
  law: { col: "#b48fd6", shape: "diamond" },
  sundial: { col: "#7fd6a8", shape: "hex" },
  scales: { col: "#e8867f", shape: "cross" },
  astrolabe: { col: "#cfd36f", shape: "star" },
};

/* ============================================================
   SURFACE TREATMENT
   The flat fills above say what a thing *is*; these say how it
   should look on the table. Kept as tokens so the whole board
   re-skins from one place rather than from 40 inline gradients.
   ============================================================ */
export const FONT = {
  display: "'Cinzel', 'Iowan Old Style', Georgia, serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

export const G = {
  /* The table itself: a warm pool of light in the middle, dark at the edges. */
  board: `radial-gradient(120% 90% at 50% -10%, #23383e 0%, #1a2a2f 45%, #121e22 100%)`,
  panel: `linear-gradient(180deg, #24393f 0%, #1d2f34 100%)`,
  panel2: `linear-gradient(180deg, #2f4950 0%, #263c43 100%)`,
  /* Card stock. Slightly warmer at the top, as printed board is. */
  card: `linear-gradient(175deg, #fbf7ec 0%, #f2ebd9 55%, #e6dcc4 100%)`,
  gold: `linear-gradient(180deg, #e6bc63 0%, #d6a850 55%, #b98c39 100%)`,
  goldHot: `linear-gradient(180deg, #f2cd7c 0%, #e0b45e 55%, #c69742 100%)`,
};

export const SHADOW = {
  card: "0 1px 2px rgba(0,0,0,.5), 0 4px 10px -3px rgba(0,0,0,.55)",
  cardUp: "0 2px 4px rgba(0,0,0,.5), 0 14px 26px -8px rgba(0,0,0,.7)",
  panel: "0 1px 0 rgba(255,255,255,.045) inset, 0 8px 22px -14px rgba(0,0,0,.9)",
  sunk: "0 2px 6px rgba(0,0,0,.45) inset",
};

/* A resource pip reads as a physical disc: lit from above, seated in a well. */
export const pipFill = (c: string): string =>
  `radial-gradient(circle at 32% 26%, ${c}f2 0%, ${c} 42%, ${shade(c, -34)} 100%)`;

/* Darken (n<0) or lighten (n>0) a #rrggbb by n percentage points. */
export function shade(hex: string, n: number): string {
  const v = parseInt(hex.slice(1), 16);
  const f = (b: number) => {
    const x = Math.round(((v >> b) & 255) + 255 * (n / 100));
    return Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0");
  };
  return `#${f(16)}${f(8)}${f(0)}`;
}
