/* ============================================================
   PALETTE
   The domain's closed vocabularies live here as unions, so a typo in
   a resource or symbol name is a compile error rather than a silent
   undefined at render time.
   ============================================================ */
export type Resource = "wood" | "clay" | "stone" | "glass" | "papyrus";
export type CardColor = "brown" | "grey" | "blue" | "green" | "yellow" | "red" | "purple";
export type ScienceSymbol = "wheel" | "tablet" | "mortar" | "plumb" | "sundial" | "astrolabe" | "law";

/* One glyph is a stack of parts drawn in a 16x16 box. A part with `w` is
   stroked at that width, one without is filled; `ink` draws it in dark over
   the symbol's own colour. */
export interface SciPart {
  d: string;
  w?: number;
  ink?: boolean;
}
export interface SciGlyph {
  col: string;
  label: string;
  parts: SciPart[];
}

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

export const SCIINK = "rgba(24,19,10,.62)";

/* The seven scientific symbols. Six appear on two green cards each; the
   seventh, the scales, is carried only by the Law progress token. */
export const SCI: Record<ScienceSymbol, SciGlyph> = {
  wheel: {
    col: "#e0b23c",
    label: "Wheel",
    parts: [
      { d: "M8 1.9a6.1 6.1 0 1 0 0 12.2a6.1 6.1 0 1 0 0-12.2", w: 1.5 },
      { d: "M8 2.6V13.4M2.6 8H13.4M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6", w: 1 },
      { d: "M8 6.1a1.9 1.9 0 1 0 0 3.8a1.9 1.9 0 1 0 0-3.8" },
    ],
  },
  tablet: {
    col: "#6fbfe8",
    label: "Inscribed tablet",
    parts: [
      { d: "M4.1 1.9h7.8a1.3 1.3 0 0 1 1.3 1.3v9.6a1.3 1.3 0 0 1-1.3 1.3H4.1a1.3 1.3 0 0 1-1.3-1.3V3.2a1.3 1.3 0 0 1 1.3-1.3z" },
      { d: "M5.2 5.3h5.6M5.2 8h5.6M5.2 10.7h3.4", w: 1.1, ink: true },
    ],
  },
  mortar: {
    col: "#d2705e",
    label: "Mortar and pestle",
    parts: [
      { d: "M10.9 2.1L6.6 6.8", w: 1.9 },
      { d: "M2.5 7.1h11a5.5 5.5 0 0 1-5.5 6.8a5.5 5.5 0 0 1-5.5-6.8z" },
    ],
  },
  plumb: {
    col: "#8c9a33",
    label: "Plumb bob",
    parts: [
      { d: "M8 1.1V5", w: 1.3 },
      { d: "M6.2 4.7h3.6v1.8H6.2z" },
      { d: "M5.1 6.4h5.8L8 14.7z" },
    ],
  },
  sundial: {
    col: "#7fd6a8",
    label: "Sundial",
    parts: [
      { d: "M1.5 13.3a6.5 6.5 0 0 1 13 0z" },
      { d: "M6.1 13.3L11.5 4.6v8.7z", ink: true },
    ],
  },
  astrolabe: {
    col: "#b48fd6",
    label: "Armillary sphere",
    parts: [
      { d: "M8 1.9a6.1 6.1 0 1 0 0 12.2a6.1 6.1 0 1 0 0-12.2", w: 1.5 },
      { d: "M1.9 8a6.1 3.1 0 1 0 12.2 0a6.1 3.1 0 1 0-12.2 0", w: 1 },
      { d: "M4.9 8a3.1 6.1 0 1 0 6.2 0a3.1 6.1 0 1 0-6.2 0", w: 1 },
      { d: "M8 0.9V2.6M8 13.4v1.7", w: 1.4 },
    ],
  },
  law: {
    col: "#e8867f",
    label: "Scales of law",
    parts: [
      { d: "M8 1.1a1.1 1.1 0 1 0 0 2.2a1.1 1.1 0 1 0 0-2.2" },
      { d: "M2.9 5.3h10.2M8 3.1v10.4M5.3 13.7h5.4", w: 1.4 },
      { d: "M3.6 5.3v2.5M12.4 5.3v2.5", w: .9 },
      { d: "M1.1 7.8a2.5 2.5 0 0 0 5 0z" },
      { d: "M9.9 7.8a2.5 2.5 0 0 0 5 0z" },
    ],
  },
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
