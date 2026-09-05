import * as E from "../src/engine.js";
const ok = [], bad = [];
const t = (name, cond, got) => (cond ? ok : bad).push(name + (cond ? "" : `  → got ${JSON.stringify(got)}`));

/* Build a play-phase game with chosen wonders and full pockets. */
function rig(wonders0, wonders1 = ["pyramids"], tokens0 = []) {
  let st = E.newGame(["A", "B"]);
  st.phase = "play";
  st.players[0].wonders = wonders0.map((id) => ({ id, built: false }));
  st.players[1].wonders = wonders1.map((id) => ({ id, built: false }));
  st.players[0].tokens = tokens0;
  st.players[0].coins = 99;
  st.players[1].coins = 99;
  st.age = 1;
  st.deck = E.CARDS.filter((k) => k.age === 1).map((k) => k.id);
  st.slots = E.buildSlots(1);
  st.slots.forEach((s, n) => { s.card = st.deck[n % st.deck.length]; s.up = true; });
  st.remaining = 20;
  st.turn = 0;
  return st;
}
const openSlot = (st) => st.slots.filter((s) => s.card && E.isOpen(st.slots, s))[0].id;

/* ---------- 1. every wonder builds without crashing ---------- */
for (const w of E.WONDERS) {
  try {
    let st = rig([w.id]);
    st.players[1].built = ["glassworks", "lumber_yard"];   // targets for destroy effects
    st.discard = ["altar"];                                 // target for Mausoleum
    const after = E.actWonder(st, openSlot(st), w.id);
    if (!after) { t(`${w.name} builds`, false, "returned null"); continue; }
    const built = after.players[0].wonders.find((x) => x.id === w.id);
    t(`${w.name} builds`, built && built.built, built);
  } catch (e) { t(`${w.name} builds`, false, e.message); }
}

/* ---------- 2. play again keeps the turn ---------- */
for (const id of ["sphinx", "hanging_gardens", "temple_of_artemis", "appian_way", "piraeus"]) {
  const st = rig([id]);
  const a = E.actWonder(st, openSlot(st), id);
  t(`${E.WON[id].name} grants another turn`, a.turn === 0, a.turn);
}
{
  const st = rig(["colossus"]);
  const a = E.actWonder(st, openSlot(st), "colossus");
  t("Colossus does NOT grant another turn", a.turn === 1, a.turn);
}

/* ---------- 3. theology ---------- */
{
  const st = rig(["colossus"], ["pyramids"], ["theology"]);
  const a = E.actWonder(st, openSlot(st), "colossus");
  t("Theology gives Colossus play again", a.turn === 0, a.turn);
}

/* ---------- 4. coin and treasury effects ---------- */
{
  const st = rig(["temple_of_artemis"]);
  st.players[0].built = ["lumber_yard", "stone_pit", "glassworks", "press"]; // covers the cost
  st.players[0].coins = 0;
  const a = E.actWonder(st, openSlot(st), "temple_of_artemis");
  t("Temple of Artemis pays 12", a.players[0].coins === 12, a.players[0].coins);
}
{
  const st = rig(["appian_way"]); st.players[0].coins = 20; st.players[1].coins = 10;
  const a = E.actWonder(st, openSlot(st), "appian_way");
  t("Appian Way: opponent loses 3", a.players[1].coins === 7, a.players[1].coins);
}
{
  const st = rig(["appian_way"]); st.players[1].coins = 1;
  const a = E.actWonder(st, openSlot(st), "appian_way");
  t("Appian Way cannot push opponent below 0", a.players[1].coins === 0, a.players[1].coins);
}

/* ---------- 5. shields ---------- */
{
  const st = rig(["colossus"]);
  const a = E.actWonder(st, openSlot(st), "colossus");
  t("Colossus moves conflict 2", a.conflict === 2, a.conflict);
}
{
  const st = rig(["colossus"], ["pyramids"], ["strategy"]);
  const a = E.actWonder(st, openSlot(st), "colossus");
  t("Strategy does NOT boost wonder shields", a.conflict === 2, a.conflict);
}
{
  const st = rig(["colossus"]); st.conflict = 7;
  const a = E.actWonder(st, openSlot(st), "colossus");
  t("Wonder shields can win militarily", a.winner && a.winner.by === "military" && a.phase === "over", a.winner);
}

/* ---------- 6. production ---------- */
{
  const st = rig(["great_lighthouse"]);
  const a = E.actWonder(st, openSlot(st), "great_lighthouse");
  const v = E.view(a, 0);
  t("Great Lighthouse adds a flexible producer", v.choices.length === 1 && v.choices[0].length === 3, v.choices);
  t("Great Lighthouse does not inflate opponent trade price",
    E.cardCost({ players: [{ coins: 99, built: [], wonders: [], tokens: [] }, a.players[0]] }, 0, E.CARD.baths).total === 2,
    E.cardCost({ players: [{ coins: 99, built: [], wonders: [], tokens: [] }, a.players[0]] }, 0, E.CARD.baths).total);
}

/* ---------- 7. architecture discount ---------- */
{
  const plain = E.wonderCost(rig(["pyramids"]), 0, E.WON.pyramids);           // 3 stone + 1 papyrus
  const disc = E.wonderCost(rig(["pyramids"], ["colossus"], ["architecture"]), 0, E.WON.pyramids);
  t("Architecture waives 2 resources on a wonder", plain.total === 8 && disc.total === 4, { plain: plain.total, disc: disc.total });
  const cardUnaffected = E.cardCost(rig(["pyramids"], ["colossus"], ["architecture"]), 0, E.CARD.aqueduct);
  t("Architecture does NOT discount ordinary cards", cardUnaffected.total === 6, cardUnaffected.total);
}

/* ---------- 8. interrupts ---------- */
{
  const st = rig(["circus_maximus"]);
  st.players[1].built = ["glassworks", "press", "lumber_yard"];
  const a = E.actWonder(st, openSlot(st), "circus_maximus");
  t("Circus Maximus asks which grey card to destroy",
    a.pending && a.pending.type === "destroy" && a.pending.color === "grey", a.pending);
  const b = E.resolve(a, "glassworks");
  t("destroyed card leaves the city", !b.players[1].built.includes("glassworks"), b.players[1].built);
  t("destroyed card enters the discard", b.discard.includes("glassworks"), b.discard);
}
{
  const st = rig(["circus_maximus"]);
  st.players[1].built = ["lumber_yard"];                 // no grey cards
  const a = E.actWonder(st, openSlot(st), "circus_maximus");
  t("Circus Maximus with no valid target does not hang", a.pending === null && a.turn === 1, a.pending);
}
{
  const st = rig(["statue_of_zeus"]);
  st.players[1].built = ["lumber_yard", "glassworks"];
  const a = E.actWonder(st, openSlot(st), "statue_of_zeus");
  t("Statue of Zeus targets brown", a.pending && a.pending.color === "brown", a.pending);
}
{
  const st = rig(["mausoleum"]);
  st.discard = ["altar", "quarry"];
  const a = E.actWonder(st, openSlot(st), "mausoleum");
  t("Mausoleum offers the discard", a.pending && a.pending.type === "mausoleum", a.pending);
  const b = E.resolve(a, "altar");
  t("raised card is built free", b.players[0].built.includes("altar") && !b.discard.includes("altar"), b.players[0].built);
}
{
  const st = rig(["great_library"]);
  const a = E.actWonder(st, openSlot(st), "great_library");
  t("Great Library offers 3 archived tokens",
    a.pending && a.pending.type === "library" && a.pending.options.length === 3, a.pending);
  t("Library options come from the box, not the board",
    a.pending.options.every((o) => st.box.includes(o)), a.pending.options);
  const b = E.resolve(a, a.pending.options[0]);
  t("archived token is kept", b.players[0].tokens.length === 1, b.players[0].tokens);
}

/* ---------- 9. play again survives an interrupt ---------- */
{
  const st = rig(["circus_maximus"], ["pyramids"], ["theology"]);
  st.players[1].built = ["glassworks"];
  const a = E.actWonder(st, openSlot(st), "circus_maximus");
  const b = E.resolve(a, "glassworks");
  t("Theology play-again survives the destroy interrupt", b.turn === 0, b.turn);
}

/* ---------- 10. the seven wonder cap ---------- */
{
  let st = rig(["colossus", "pyramids", "sphinx", "mausoleum"], ["great_lighthouse", "piraeus", "obelisk_x", "temple_of_artemis"]);
  st.players[1].wonders = ["great_lighthouse", "piraeus", "hanging_gardens", "temple_of_artemis"].map((id) => ({ id, built: false }));
  // build four for A and three for B
  const seq = [[0, "colossus"], [1, "great_lighthouse"], [0, "pyramids"], [1, "piraeus"],
               [0, "sphinx"], [1, "hanging_gardens"], [0, "mausoleum"]];
  for (const [p, id] of seq) {
    st.turn = p; st.players[p].coins = 99; st.pending = null;
    st = E.actWonder(st, openSlot(st), id);
    if (st.pending) st = E.resolve(st, st.pending.type === "mausoleum" ? st.discard[0] : st.pending.options ? st.pending.options[0] : 0);
  }
  const totalBuilt = st.players[0].wonders.filter((w) => w.built).length + st.players[1].wonders.filter((w) => w.built).length;
  const leftover = st.players[0].wonders.filter((w) => !w.built).length + st.players[1].wonders.filter((w) => !w.built).length;
  t("exactly 7 wonders built", totalBuilt === 7, totalBuilt);
  t("the 8th wonder is removed from play", leftover === 0, leftover);
  t("wondersBuilt counter agrees", st.wondersBuilt === 7, st.wondersBuilt);
}

/* ---------- 11. wonder scoring ---------- */
{
  const st = rig(["pyramids", "sphinx"]);
  st.players[0].wonders.forEach((w) => (w.built = true));
  t("built wonders score (9+6)", E.score(st, 0).wonders === 15, E.score(st, 0).wonders);
  const st2 = rig(["pyramids", "sphinx"]);
  st2.players[0].wonders[0].built = true;
  t("unbuilt wonders score nothing", E.score(st2, 0).wonders === 9, E.score(st2, 0).wonders);
}

/* ---------- 12. cost is paid, card is consumed ---------- */
{
  const st = rig(["pyramids"]); st.players[0].coins = 20;
  const slot = openSlot(st);
  const a = E.actWonder(st, slot, "pyramids");
  t("wonder cost is deducted (8 for 3 stone + 1 papyrus)", a.players[0].coins === 12, a.players[0].coins);
  t("the card used is consumed", a.slots.find((s) => s.id === slot).card === null, "still there");
  t("remaining count drops", a.remaining === 19, a.remaining);
  t("card used for a wonder does NOT enter the city", a.players[0].built.length === 0, a.players[0].built);
  t("card used for a wonder does NOT enter the discard", a.discard.length === 0, a.discard);
}
{
  const st = rig(["pyramids"]); st.players[0].coins = 3;   // too poor
  t("unaffordable wonder is refused", E.actWonder(st, openSlot(st), "pyramids") === null, "allowed");
}

console.log(`PASS ${ok.length}`);
if (bad.length) { console.log(`\nFAIL ${bad.length}`); bad.forEach((b) => console.log("  ✗ " + b)); }
else console.log("No failures.");
