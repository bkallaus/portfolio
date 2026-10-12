import type { Age, GameState } from "./engine.ts";

export type Fx =
  | { kind: "age"; player: -1; age: Age }
  | { kind: "coins"; player: number; n: number }
  | { kind: "shields"; player: number; n: number }
  | { kind: "card"; player: number; id: string }
  | { kind: "destroyed"; player: number; id: string }
  | { kind: "wonder"; player: number; id: string }
  | { kind: "token"; player: number; id: string };

const added = (before: string[], after: string[]): string[] => {
  const left = [...before];
  return after.filter((id) => {
    const k = left.indexOf(id);
    if (k < 0) return true;
    left.splice(k, 1);
    return false;
  });
};

export function diffEvents(prev: GameState, next: GameState): Fx[] {
  const out: Fx[] = [];
  const entering = prev.phase === "draft" && next.phase === "play";
  if (entering || (next.phase === "play" && next.age !== prev.age)) {
    out.push({ kind: "age", player: -1, age: next.age });
  }
  if (prev.phase === "draft") return out;

  const push = next.conflict - prev.conflict;
  if (push > 0) out.push({ kind: "shields", player: 0, n: push });
  if (push < 0) out.push({ kind: "shields", player: 1, n: -push });

  [0, 1].forEach((i) => {
    const a = prev.players[i]!, b = next.players[i]!;
    const coins = b.coins - a.coins;
    if (coins) out.push({ kind: "coins", player: i, n: coins });
    for (const id of added(a.built, b.built)) out.push({ kind: "card", player: i, id });
    for (const id of added(b.built, a.built)) out.push({ kind: "destroyed", player: i, id });
    for (const w of b.wonders) {
      if (w.built && !a.wonders.find((x) => x.id === w.id)?.built) out.push({ kind: "wonder", player: i, id: w.id });
    }
    for (const id of added(a.tokens, b.tokens)) out.push({ kind: "token", player: i, id });
  });
  return out;
}
