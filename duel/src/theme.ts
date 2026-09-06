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
