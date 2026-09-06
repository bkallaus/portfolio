import * as E from "../src/engine.ts";
const ok: string[] = [], bad: string[] = [];
const t=(n: string,c: unknown,g?: unknown)=>(c?ok:bad).push(n+(c?"":`  → got ${JSON.stringify(g)}`));

/* The actions return null for an illegal move. Every call below is one the rig
   has made legal, so a null here is a failing test rather than a case to handle. */
const must=(st: E.GameState|null): E.GameState=>{ if(!st) throw new Error("expected a legal move"); return st; };

function rig(w0: string[],w1: string[]=["pyramids"],tok: string[]=[]): E.GameState{
  let st=E.newGame(["A","B"]); st.phase="play";
  st.players[0].wonders=w0.map(id=>({id,built:false}));
  st.players[1].wonders=w1.map(id=>({id,built:false}));
  st.players[0].tokens=tok; st.players[0].coins=99; st.players[1].coins=99;
  st.age=1; st.deck=E.CARDS.filter(k=>k.age===1).map(k=>k.id);
  st.slots=E.buildSlots(1);
  st.slots.forEach((s,n)=>{s.card=st.deck[n%st.deck.length];s.up=true;});
  st.remaining=20; st.turn=0;
  return st;
}
const open=(st: E.GameState): number=>st.slots.filter(s=>s.card&&E.isOpen(st.slots,s))[0].id;

/* --- play again on the final card of an age is lost --- */
{
  let st=rig(["sphinx"]);
  // strip the board down to a single remaining card
  st.slots.forEach(s=>{s.card=null;});
  const last=st.slots[st.slots.length-1]; last.card="lumber_yard"; last.up=true;
  st.remaining=1;
  const a=must(E.actWonder(st,last.id,"sphinx"));
  t("play again on the last card of an age does not replay",
    a.remaining===0 && a.pending && a.pending.type==="first", {rem:a.remaining,pend:a.pending});
}

/* --- play again mid-age lets the same player act twice --- */
{
  let st=rig(["sphinx","colossus"]);
  const a=must(E.actWonder(st,open(st),"sphinx"));
  t("after Sphinx it is still A's turn", a.turn===0, a.turn);
  const b=must(E.actWonder(a,open(a),"colossus"));
  t("A can build a second wonder in the extra turn",
    b.players[0].wonders.every(w=>w.built), b.players[0].wonders);
  t("turn passes after the non-repeating second wonder", b.turn===1, b.turn);
}

/* --- Economy captures wonder trade spending --- */
{
  let st=rig(["pyramids"]);
  st.players[1].tokens=["economy"];
  st.players[1].coins=0;
  const cost=E.wonderCost(st,0,E.WON.pyramids).total;
  const a=must(E.actWonder(st,open(st),"pyramids"));
  t("Economy gives opponent the wonder's trade spend",
    a.players[1].coins===cost && cost>0, {opp:a.players[1].coins,cost});
}

/* --- Architecture + partial production --- */
{
  let st=rig(["pyramids"],["colossus"],["architecture"]);
  st.players[0].built=["quarry","quarry"];       // 2 of the 3 stone
  const c=E.wonderCost(st,0,E.WON.pyramids);
  t("Architecture waives the remaining stone and papyrus", c.total===0, c.total);
}

/* --- Architecture waives the priciest units, not the first --- */
{
  let st=rig(["temple_of_artemis"],["colossus"],["architecture"]);
  st.players[1].built=["sawmill","brickyard","shelf_quarry"];  // opponent inflates wood/clay/stone
  // needs wood, stone, glass, papyrus. wood=4, stone=4, glass=2, papyrus=2 → waive the two 4s
  const c=E.wonderCost(st,0,E.WON.temple_of_artemis);
  t("Architecture waives the two most expensive resources", c.total===4, c.total);
}

/* --- destroy interrupt on the final card of an age --- */
{
  let st=rig(["circus_maximus"]);
  st.players[1].built=["glassworks"];
  st.slots.forEach(s=>{s.card=null;});
  const last=st.slots[st.slots.length-1]; last.card="lumber_yard"; last.up=true;
  st.remaining=1;
  const a=must(E.actWonder(st,last.id,"circus_maximus"));
  t("destroy still resolves when the age is ending", a.pending!.type==="destroy", a.pending);
  const b=E.resolve(a,"glassworks");
  t("age transition happens after the interrupt clears",
    b.pending && b.pending.type==="first", b.pending);
}

/* --- a wonder that both wins militarily and has a destroy effect --- */
{
  let st=rig(["circus_maximus"]);
  st.conflict=8; st.players[1].built=["glassworks"];
  const a=must(E.actWonder(st,open(st),"circus_maximus"));
  t("military win outranks the destroy prompt",
    a.phase==="over" && a.winner!.by==="military" && !a.pending, {phase:a.phase,pend:a.pending});
}

/* --- looting tokens fire once, in the right direction --- */
{
  let st=rig(["colossus"]); st.conflict=2; st.players[1].coins=10;
  const a=must(E.actWonder(st,open(st),"colossus"));   // → +4, crosses 3
  t("crossing zone 3 loots the opponent for 2", a.players[1].coins===8, a.players[1].coins);
  t("that looting token is spent", a.loot.p1_2===false, a.loot);
  t("the other side's token is untouched", a.loot.p0_2===true, a.loot);
}

/* --- wonder production is usable immediately --- */
{
  let st=rig(["great_lighthouse"]);
  st.players[0].built=["lumber_yard","stone_pit","press"];
  const a=must(E.actWonder(st,open(st),"great_lighthouse"));
  const before=E.cardCost(st,0,E.CARD.baths).total;      // needs 1 stone, already has it → 0
  st.players[0].built=[];
  const bare=E.cardCost(st,0,E.CARD.baths).total;
  const a2=must(E.actWonder(st,open(st),"great_lighthouse"));
  t("Great Lighthouse can supply the stone for Baths",
    bare===2 && E.cardCost(a2,0,E.CARD.baths).total===0, {bare, after:E.cardCost(a2,0,E.CARD.baths).total});
}

console.log(`PASS ${ok.length}`);
if(bad.length){console.log(`\nFAIL ${bad.length}`);bad.forEach(b=>console.log("  ✗ "+b));}else console.log("No failures.");
