import { describe, expect, it } from "vitest";
import { actBuild, actDiscard, clone, draftPick, newGame } from "./engine.ts";
import type { GameState } from "./engine.ts";
import { diffEvents } from "./fx.ts";

function started(): GameState {
  let st = newGame(["A", "B"]);
  for (let k = 0; k < 8; k++) st = draftPick(clone(st), st.draftPool[0]!);
  return st;
}

const openSlot = (st: GameState) =>
  st.slots.find((s) => s.card && s.card !== "?" && s.coveredBy.every((id) => st.slots[id]!.card === null))!;

describe("diffEvents", () => {
  it("announces the first age when the draft ends", () => {
    let st = newGame(["A", "B"]);
    for (let k = 0; k < 7; k++) st = draftPick(clone(st), st.draftPool[0]!);
    const last = draftPick(clone(st), st.draftPool[0]!);
    expect(diffEvents(st, last)).toContainEqual({ kind: "age", player: -1, age: 1 });
  });

  it("reports the coins a discard pays out to the player who discarded", () => {
    const st = started();
    const next = actDiscard(st, openSlot(st).id);
    expect(diffEvents(st, next)).toContainEqual({ kind: "coins", player: st.turn, n: 2 });
  });

  it("reports a built card against its builder", () => {
    const st = started();
    st.players[st.turn]!.coins = 99;
    const slot = openSlot(st);
    const next = actBuild(st, slot.id)!;
    expect(diffEvents(st, next)).toContainEqual({ kind: "card", player: st.turn, id: slot.card });
  });

  it("credits shields to whichever side pushed the pawn", () => {
    const st = started();
    const next = clone(st);
    next.conflict = -2;
    expect(diffEvents(st, next)).toContainEqual({ kind: "shields", player: 1, n: 2 });
  });

  it("reports nothing when the state is unchanged", () => {
    const st = started();
    expect(diffEvents(st, clone(st))).toEqual([]);
  });
});
