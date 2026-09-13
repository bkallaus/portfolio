import * as E from "../src/engine.ts";

/* cardCost and friends only reach into players, so a stub carrying just that
   is enough to price a card against a hand-made pair of cities. */
const twoCities = (players: E.PlayerState[]): E.GameState => ({ players }) as unknown as E.GameState;

/* ---------- structural checks ---------- */
const fails: string[] = [];
const expectOpen: Record<E.Age, number> = { 1: 6, 2: 2, 3: 2 };
for (const age of [1, 2, 3] as E.Age[]) {
  const slots = E.buildSlots(age);
  slots.forEach((s) => {
    s.card = "x";
  });
  const open = slots.filter((s) => E.isOpen(slots, s)).length;
  if (open !== expectOpen[age]) fails.push(`Age ${age}: ${open} open at start, expected ${expectOpen[age]}`);
  if (slots.length !== 20) fails.push(`Age ${age}: ${slots.length} slots, expected 20`);
  const faceDown = slots.filter((s) => !s.up).length;
  if (faceDown !== 8) fails.push(`Age ${age}: ${faceDown} face down, expected 8`);

  // every slot must eventually become reachable
  let guard = 0, taken = 0;
  while (slots.some((s) => s.card !== null) && guard++ < 100) {
    const o = slots.filter((s) => E.isOpen(slots, s));
    if (!o.length) break;
    o[Math.floor(Math.random() * o.length)].card = null;
    taken++;
  }
  if (taken !== 20) fails.push(`Age ${age}: only ${taken}/20 slots reachable — dead structure`);
}

/* ---------- deck sanity ---------- */
for (const age of [1, 2, 3]) {
  const n = E.CARDS.filter((k) => k.age === age).length;
  console.log(`Age ${age} deck: ${n} cards${age === 3 ? ` + 3 of 7 guilds = ${n + 3}` : ""}`);
  if ((age === 3 ? n + 3 : n) < 20) fails.push(`Age ${age} deck too small to deal 20`);
}
const chainTargets = E.CARDS.filter((k) => k.chainFrom);
chainTargets.forEach((k) => { if (!E.CARD[k.chainFrom!]) fails.push(`${k.name} chains from unknown ${k.chainFrom}`); });

// science distribution
const sciCount: Record<string, number> = {};
E.CARDS.forEach((k) => { if (k.sci) sciCount[k.sci] = (sciCount[k.sci] || 0) + 1; });
const tokenSci = E.TOKENS.filter((t) => t.sci).map((t) => t.sci!);
const allSci = new Set([...Object.keys(sciCount), ...tokenSci]);
console.log("science symbols on cards:", sciCount);
console.log("science symbols on tokens:", tokenSci);
const pairable = Object.values(sciCount).filter((n) => n === 2).length;
console.log(`${allSci.size} symbols in the game, ${Object.keys(sciCount).length} on cards, ${pairable} obtainable as a pair`);
if (allSci.size !== 7) fails.push(`${allSci.size} distinct symbols in the game, expected 7`);
if (Object.keys(sciCount).length !== 6) fails.push(`${Object.keys(sciCount).length} distinct symbols on cards, expected 6`);
Object.entries(sciCount).forEach(([s, n]) => {
  if (n !== 2) fails.push(`${s} is on ${n} card${n === 1 ? "" : "s"}, expected 2 — every card symbol must be pairable`);
});
tokenSci.forEach((s) => {
  if (sciCount[s]) fails.push(`${s} is on a progress token and on ${sciCount[s]} cards — the token symbol is unique to the token`);
});
const greens = E.CARDS.filter((k) => k.color === "green");
if (greens.length !== 12) fails.push(`${greens.length} green cards, expected 12`);
greens.forEach((k) => { if (!k.sci) fails.push(`${k.name} is green but carries no scientific symbol`); });

/* ---------- random self-play ---------- */
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const wins: Record<E.WinReason, number> = { military: 0, science: 0, points: 0, tiebreak: 0, draw: 0 };
let totals: number[] = [], turnCounts: number[] = [], errors = 0, stuck = 0;

for (let g = 0; g < 4000; g++) {
  try {
    let st = E.newGame(["A", "B"]);
    while (st.phase === "draft") st = E.draftPick(E.clone(st), pick(st.draftPool));

    let guard = 0;
    while (st.phase === "play" && guard++ < 400) {
      if (st.pending) {
        const pd = st.pending;
        let opts: (string | number)[] | undefined;
        if (pd.type === "progress") opts = st.board;
        else if (pd.type === "library") opts = pd.options;
        else if (pd.type === "destroy") opts = st.players[1 - pd.player].built.filter((id) => E.CARD[id].color === pd.color);
        else if (pd.type === "mausoleum") opts = st.discard;
        else if (pd.type === "first") opts = [0, 1];
        if (!opts?.length) { fails.push(`pending ${pd.type} with no options`); break; }
        st = E.resolve(st, pick(opts));
        continue;
      }
      const i = st.turn;
      const open = st.slots.filter((s) => s.card && s.card !== "?" && E.isOpen(st.slots, s));
      if (!open.length) { stuck++; break; }
      const s = pick(open);
      const card = E.CARD[s.card!];
      const moves: (() => E.GameState | null)[] = [() => E.actDiscard(st, s.id)];
      if (E.cardCost(st, i, card).total <= st.players[i].coins) moves.push(() => E.actBuild(st, s.id));
      st.players[i].wonders.filter((w) => !w.built).forEach((w) => {
        if (E.wonderCost(st, i, E.WON[w.id]).total <= st.players[i].coins)
          moves.push(() => E.actWonder(st, s.id, w.id));
      });
      const next = pick(moves)();
      if (!next) { fails.push("action returned null despite affordability check"); break; }
      st = next;
    }
    if (guard >= 400) { stuck++; continue; }
    if (st.phase !== "over") { stuck++; continue; }
    turnCounts.push(guard);
    wins[st.winner?.by]++;
    if (st.winner?.by !== "military" && st.winner?.by !== "science") {
      totals.push(E.score(st, 0).total, E.score(st, 1).total);
    }
    // wonders built must never exceed 7
    const built = st.players[0].wonders.filter((w) => w.built).length + st.players[1].wonders.filter((w) => w.built).length;
    if (built > 7) fails.push(`${built} wonders built — cap broken`);
  } catch (e) {
    errors++;
    if (errors <= 3) console.log("CRASH:", (e as Error).message, "\n", (e as Error).stack?.split("\n")[1]);
  }
}

console.log("\n--- 4000 random games ---");
console.log("crashes:", errors, " unfinished:", stuck);
console.log("endings:", wins);
const avg = (a: number[]): string => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log("avg civilian score:", avg(totals), " avg actions/game:", avg(turnCounts));

console.log("\n--- cost solver spot checks ---");
const mk = (built: string[], tokens: string[] = []): E.GameState =>
  twoCities([{ coins: 99, built, wonders: [], tokens }, { coins: 99, built: [], wonders: [], tokens: [] }]);
const t1 = E.cardCost(mk([]), 0, E.CARD.aqueduct);              // 3 stone, no production
const t2 = E.cardCost(mk(["quarry", "quarry"]), 0, E.CARD.aqueduct);
const t3 = E.cardCost(mk(["baths"]), 0, E.CARD.aqueduct);        // chain
const t4 = E.cardCost(mk([], ["masonry"]), 0, E.CARD.aqueduct);  // waive 2
const t5 = E.cardCost(mk(["stone_reserve"]), 0, E.CARD.aqueduct);// stone at 1 each
console.log("aqueduct (3 stone) from nothing:", t1.total, "expect 6");
console.log("  with 2 stone produced:", t2.total, "expect 2");
console.log("  chained from Baths:", t3.total, t3.chained, "expect 0 true");
console.log("  with Masonry:", t4.total, "expect 2");
console.log("  with Stone Reserve:", t5.total, "expect 3");

// opponent-driven inflation
const inflated = twoCities([{ coins: 99, built: [], wonders: [], tokens: [] }, { coins: 99, built: ["quarry", "shelf_quarry"], wonders: [], tokens: [] }]);
console.log("  opponent produces 3 stone:", E.cardCost(inflated, 0, E.CARD.aqueduct).total, "expect 15");

// flexible producer should be spent on the priciest need
const flex = twoCities([{ coins: 99, built: ["caravansery"], wonders: [], tokens: [] }, { coins: 99, built: ["quarry", "quarry"], wonders: [], tokens: [] }]);
console.log("  Caravansery vs opp 2 stone, needs 3 stone:", E.cardCost(flex, 0, E.CARD.aqueduct).total, "expect 8");

console.log("\n--- military zones ---");
[0, 1, 2, 3, 5, 6, 8].forEach((d) => {
  process.stdout.write(`${d}:${E.milVP(d)}  `);
});
console.log("\nexpect 0:0 1:2 2:2 3:5 5:5 6:10 8:10");

console.log(`\n${fails.length ? `FAILURES:\n${fails.slice(0, 20).map((f) => ` - ${f}`).join("\n")}` : "All structural checks passed."}`);
