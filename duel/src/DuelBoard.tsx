import React, { useState, useEffect, useRef } from "react";
import { C, CARDCOL, RES, RESCOL, RESLET, SCI } from "./theme.ts";
import type { CardColor, Resource, ScienceSymbol } from "./theme.ts";
import {
  CARDS, CARD, WONDERS, WON, TOKENS, TOK, LAYOUTS,
  isOpen, view, cardCost, wonderCost,
  newGame, DRAFT, draftPick, clone,
  actBuild, actDiscard, actWonder, resolve,
  milVP, score,
} from "./engine.ts";
import type { Age, Card, Cost, GameState, ScoreBreakdown } from "./engine.ts";
import { loadPeer, quickHost, quickJoin, manualHost, manualJoin, unpack } from "./net.ts";
import type { Handlers, Link, PeerInstance, Role } from "./net.ts";

/* Object.entries widens its keys to string; this keeps the domain union. */
const entries = <K extends string, V>(o: Partial<Record<K, V>>): [K, V][] =>
  Object.entries(o) as [K, V][];

type Mode = "local" | "direct";
type Transport = "quick" | "manual";
type QuickProbe = "checking" | "ready" | "no";

/* What the linking screen is showing: the code we produced, or a spinner
   while we produce it. */
interface LinkStep {
  how: Transport;
  role: Role;
  step: "working" | "share";
  myCode?: string;
}

/* ============================================================
   SMALL VISUAL PARTS
   ============================================================ */
const Pip = ({ r, size = 13 }: { r: Resource; size?: number }) => (
  <span style={{
    width: size, height: size, borderRadius: "50%", background: RESCOL[r],
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.62, fontWeight: 700, color: "#1a1a17", lineHeight: 1,
  }}>{RESLET[r]}</span>
);

const Coin = ({ n, size = 14 }: { n: number; size?: number }) => (
  <span style={{
    minWidth: size, height: size, padding: "0 3px", borderRadius: size,
    background: C.gold, color: "#2a2109", fontSize: size * 0.66, fontWeight: 700,
    display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
  }}>{n}</span>
);

function SciMark({ k, size = 15 }: { k: ScienceSymbol; size?: number }) {
  const { col, shape } = SCI[k];
  const s = size, h = s / 2;
  const paths: Record<string, React.ReactElement> = {
    circle: <circle cx={h} cy={h} r={h - 1} fill={col} />,
    square: <rect x="2" y="2" width={s - 4} height={s - 4} fill={col} />,
    triangle: <polygon points={`${h},1 ${s - 1},${s - 1} 1,${s - 1}`} fill={col} />,
    diamond: <polygon points={`${h},1 ${s - 1},${h} ${h},${s - 1} 1,${h}`} fill={col} />,
    hex: <polygon points={`${h},1 ${s - 1},${s * 0.3} ${s - 1},${s * 0.7} ${h},${s - 1} 1,${s * 0.7} 1,${s * 0.3}`} fill={col} />,
    cross: <path d={`M${h - 2},1 h4 v${h - 3} h${h - 3} v4 h-${h - 3} v${h - 3} h-4 v-${h - 3} h-${h - 3} v-4 h${h - 3} z`} fill={col} />,
    star: <polygon points={`${h},0 ${h * 1.25},${h * 0.7} ${s},${h * 0.75} ${h * 1.3},${h * 1.2} ${h * 1.55},${s} ${h},${h * 1.5} ${h * 0.45},${s} ${h * 0.7},${h * 1.2} 0,${h * 0.75} ${h * 0.75},${h * 0.7}`} fill={col} />,
  };
  return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ display: "block" }}>{paths[shape]}</svg>;
}

const Shield = ({ n }: { n: number }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
    <svg width="13" height="14" viewBox="0 0 13 14"><path d="M6.5 0 13 2.5v5C13 11 9.5 13.3 6.5 14 3.5 13.3 0 11 0 7.5v-5z" fill={C.blood} /></svg>
    {n > 1 && <b style={{ fontSize: 11, color: C.blood }}>{n}</b>}
  </span>
);

const VP = ({ n }: { n: number }) => (
  <span style={{
    width: 17, height: 17, borderRadius: 3, background: CARDCOL.blue, color: "#fff",
    fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center",
  }}>{n}</span>
);

function CostRow({ cost, size = 12 }: { cost: Cost; size?: number }) {
  const items: React.ReactElement[] = [];
  if (cost.coins) items.push(<Coin key="c" n={cost.coins} size={size + 1} />);
  RES.forEach((r) => {
    for (let i = 0; i < (cost[r] || 0); i++) items.push(<Pip key={r + i} r={r} size={size} />);
  });
  if (!items.length) return <span style={{ fontSize: 10, color: C.muted }}>free</span>;
  return <span style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{items}</span>;
}

/* ============================================================
   CARD FACES
   ============================================================ */
interface CardFaceProps {
  card: Card;
  w?: number;
  selected?: boolean;
  dim?: boolean;
  onClick?: () => void;
  cost?: { total: number; chained: boolean; affordable: boolean } | null;
}

function CardFace({ card, w = 74, selected, dim, onClick, cost }: CardFaceProps) {
  const col = CARDCOL[card.color];
  return (
    <button
      onClick={onClick}
      style={{
        width: w, height: w * 1.36, borderRadius: 6, padding: 0, cursor: onClick ? "pointer" : "default",
        background: "#f2ede0", border: `2px solid ${selected ? C.gold : "rgba(0,0,0,.35)"}`,
        boxShadow: selected ? `0 0 0 3px ${C.gold}55` : "0 2px 4px rgba(0,0,0,.4)",
        opacity: dim ? 0.42 : 1, position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", textAlign: "left",
        transition: "opacity .15s, box-shadow .15s",
      }}
    >
      <div style={{ background: col, padding: "3px 4px", minHeight: 22 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: .1 }}>
          {card.name}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, flexWrap: "wrap", padding: 2 }}>
        {card.prod && entries(card.prod).flatMap(([r, n]) =>
          Array.from({ length: n }, (_, k) => <Pip key={r + k} r={r} size={14} />))}
        {card.prodChoice && (
          <span style={{ display: "flex", gap: 1, alignItems: "center" }}>
            {card.prodChoice.map((r, k) => (
              <React.Fragment key={r}>{k > 0 && <span style={{ fontSize: 8, color: "#666" }}>/</span>}<Pip r={r} size={11} /></React.Fragment>
            ))}
          </span>
        )}
        {card.sci && <SciMark k={card.sci} size={17} />}
        {card.shields > 0 && <Shield n={card.shields} />}
        {card.vp > 0 && <VP n={card.vp} />}
        {card.gainCoins && <Coin n={card.gainCoins} size={16} />}
        {card.fixTrade && (
          <span style={{ display: "flex", gap: 1, alignItems: "center", fontSize: 8, color: "#444" }}>
            {card.fixTrade.map((r) => <Pip key={r} r={r} size={10} />)}<Coin n={1} size={11} />
          </span>
        )}
        {card.coinsPer && <span style={{ fontSize: 8, color: "#444" }}>{card.coinsPer.n}c / {card.coinsPer.colors.join("+")}</span>}
        {card.coinsPerWonder && <span style={{ fontSize: 8, color: "#444" }}>{card.coinsPerWonder}c / wonder</span>}
        {card.guild && <span style={{ fontSize: 7.5, color: "#444", textAlign: "center", padding: "0 2px" }}>
          {card.guild.treasury ? "1 VP / 3 coins" : card.guild.wonders ? "2 VP / wonder" : `1 VP / ${(card.guild.colors ?? []).join("+")}`}
        </span>}
      </div>
      <div style={{ padding: "2px 3px", borderTop: "1px solid #ddd6c4", minHeight: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CostRow cost={card.cost} size={11} />
        {card.chainFrom && <span style={{ fontSize: 12, color: "#5a8a4a", lineHeight: 1 }}>⛓</span>}
      </div>
      {cost && (
        <div style={{
          position: "absolute", top: 22, right: 0,
          background: cost.chained ? "#4d8c5c" : cost.affordable ? C.gold : C.blood,
          color: cost.chained || !cost.affordable ? "#fff" : "#2a2109",
          fontSize: 10, fontWeight: 700, padding: "1px 4px", borderRadius: "0 0 0 4px",
        }}>{cost.chained ? "free" : cost.total}</div>
      )}
    </button>
  );
}

const CardBack = ({ w = 74 }: { w?: number }) => (
  <div style={{
    width: w, height: w * 1.36, borderRadius: 6,
    background: `repeating-linear-gradient(45deg, #2f4a52, #2f4a52 5px, #35545d 5px, #35545d 10px)`,
    border: "2px solid rgba(0,0,0,.35)", boxShadow: "0 2px 4px rgba(0,0,0,.4)",
  }} />
);

/* ============================================================
   BOARD PIECES
   ============================================================ */
function MilitaryTrack({ st }: { st: GameState }) {
  const cells: React.ReactElement[] = [];
  for (let v = -9; v <= 9; v++) {
    const abs = Math.abs(v);
    const zone = abs === 9 ? "cap" : abs === 0 ? "mid" : abs <= 2 ? 2 : abs <= 5 ? 5 : 10;
    const here = st.conflict === v;
    const lootHere =
      (v === 3 && st.loot.p1_2) || (v === 6 && st.loot.p1_5) ||
      (v === -3 && st.loot.p0_2) || (v === -6 && st.loot.p0_5);
    cells.push(
      <div key={v} style={{
        flex: 1, minWidth: 0, height: 24, position: "relative",
        background: zone === "cap" ? C.blood : zone === "mid" ? C.panel2 : `rgba(184,69,60,${abs <= 2 ? .12 : abs <= 5 ? .24 : .4})`,
        borderRight: v < 9 ? `1px solid ${C.line}` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {lootHere && <span style={{ fontSize: 9, color: C.gold, fontWeight: 700 }}>−{abs === 3 ? 2 : 5}</span>}
        {here && <div style={{
          position: "absolute", width: 16, height: 16, borderRadius: "50%",
          background: C.ink, border: `2px solid ${C.board}`, boxShadow: "0 1px 3px rgba(0,0,0,.6)",
        }} />}
      </div>
    );
  }
  const lead = st.conflict === 0 ? null : st.conflict > 0 ? 0 : 1;
  return (
    <div>
      <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line}` }}>{cells}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 3 }}>
        <span>{st.names[0]}</span>
        <span>{lead === null ? "even" : `${st.names[lead]} +${milVP(Math.abs(st.conflict))} VP`}</span>
        <span>{st.names[1]}</span>
      </div>
    </div>
  );
}

function TokenChip({ id, onClick, small }: { id: string; onClick?: () => void; small?: boolean }) {
  const t = TOK[id];
  return (
    <button onClick={onClick} title={t.text} style={{
      background: "#3d5f4a", border: `1px solid #5c8a6d`, color: "#e4f0e6",
      borderRadius: 4, padding: small ? "2px 5px" : "4px 7px", fontSize: small ? 9.5 : 11,
      cursor: onClick ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4,
    }}>
      {t.sci && <SciMark k={t.sci} size={11} />}
      {t.name}
    </button>
  );
}

function City({ st, i, me, compact }: { st: GameState; i: number; me?: boolean; compact?: boolean }) {
  const v = view(st, i);
  const groups: CardColor[] = ["brown", "grey", "blue", "green", "yellow", "red", "purple"];
  const sc = score(st, i);
  return (
    <div style={{ background: C.panel, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: st.turn === i && st.phase === "play" ? C.gold : C.ink }}>
          {st.names[i]}{me ? " (you)" : ""}
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.muted }}>
          <Coin n={v.p.coins} size={16} />
          {v.shields > 0 && <Shield n={v.shields} />}
          <span>{sc.total} VP</span>
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {RES.map((r) => {
          const n = v.prod[r] || 0;
          if (!n) return null;
          return <span key={r} style={{ display: "flex", alignItems: "center", gap: 2 }}><Pip r={r} size={13} /><b style={{ fontSize: 11, color: C.ink }}>{n}</b></span>;
        })}
        {v.choices.map((ch, k) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 1, opacity: .85 }}>
            {ch.map((r, m) => <React.Fragment key={r}>{m > 0 && <span style={{ fontSize: 8, color: C.muted }}>/</span>}<Pip r={r} size={11} /></React.Fragment>)}
          </span>
        ))}
        {!Object.keys(v.prod).length && !v.choices.length && <span style={{ fontSize: 11, color: C.muted }}>no production</span>}
      </div>

      {Object.keys(v.sci).length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 8, alignItems: "center" }}>
          {entries(v.sci).map(([k, n]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SciMark k={k} size={14} />{n > 1 && <b style={{ fontSize: 10, color: C.gold }}>×{n}</b>}
            </span>
          ))}
          <span style={{ fontSize: 10, color: C.muted }}>{Object.keys(v.sci).length}/6</span>
        </div>
      )}

      {v.p.tokens.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {v.p.tokens.map((t) => <TokenChip key={t} id={t} small />)}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {v.p.wonders.map((w, k) => (
          <div key={k} title={WON[w.id].text} style={{
            fontSize: 9.5, padding: "3px 6px", borderRadius: 4,
            background: w.built ? "#6a5a3a" : C.panel2,
            border: `1px solid ${w.built ? C.gold : C.line}`,
            color: w.built ? C.ink : C.muted,
            textDecoration: w.built ? "none" : "none",
          }}>
            {WON[w.id].name}
            {!w.built && <span style={{ marginLeft: 4, opacity: .8 }}><CostRow cost={WON[w.id].cost} size={9} /></span>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {groups.map((g) => {
          const list = v.p.built.filter((id) => CARD[id].color === g);
          if (!list.length) return null;
          return (
            <span key={g} style={{ display: "flex", gap: 2, alignItems: "center", background: "rgba(0,0,0,.2)", borderRadius: 4, padding: "2px 4px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: CARDCOL[g] }} />
              <span style={{ fontSize: 10, color: C.ink }}>{list.length}</span>
              {!compact && <span style={{ fontSize: 9, color: C.muted, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {list.map((id) => CARD[id].name).join(", ")}
              </span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function DuelBoard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [seat, setSeat] = useState(0);
  const [link, setLink] = useState<LinkStep | null>(null);
  const [quick, setQuick] = useState<QuickProbe>("checking");
  const [st, setSt] = useState<GameState | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hist, setHist] = useState<GameState[]>([]);
  const [status, setStatus] = useState("");
  const chan = useRef<Link | null>(null);
  /* Either transport's handle: PeerJS brokers the quick path, a raw
     RTCPeerConnection carries the manual one. Both answer to close(). */
  const peer = useRef<PeerInstance | RTCPeerConnection | null>(null);
  const names = useRef<string[]>(["Host", "Guest"]);

  const myTurn = !st ? false : mode === "local" ? true : st.turn === seat;
  const linked = (): boolean => !!chan.current && chan.current.isOpen();

  /* Probe for the broker once, so the lobby can show the quick option only
     when it will actually work. */
  useEffect(() => {
    let alive = true;
    loadPeer().then(
      () => alive && setQuick("ready"),
      () => alive && setQuick("no")
    );
    return () => { alive = false; };
  }, []);

  useEffect(() => () => { if (peer.current) peer.current.close(); }, []);

  const push = (next: GameState) => {
    if (mode !== "direct") return;
    if (!linked()) { setStatus("Connection dropped. Re-link to carry on."); return; }
    try { chan.current!.send({ t: "state", st: next }); }
    catch (e) { setStatus("Couldn't send that move — the connection may have dropped."); }
  };

  const handlers: Handlers = {
    onState: (incoming) => { setSt(incoming); setSel(null); setStatus(""); },
    onOpen: (l) => {
      chan.current = l;
      setLink(null);
      setStatus("");
      if (l.role === "host") {                 // the host owns setup and deals
        const g = newGame(names.current);
        setSt(g);
        l.send({ t: "state", st: g });
      }
    },
    onClose: () => setStatus("Connection lost. Re-link to carry on — the board is still here."),
    onError: (msg) => setStatus(msg),
  };

  const abort = (msg?: string) => {
    if (peer.current) { try { peer.current.close(); } catch (e) {} peer.current = null; }
    setLink(null); setMode(null); setStatus(msg || "");
  };

  const commit = (next: GameState | null) => {
    if (!next || !st) return;
    setHist((h) => [...h.slice(-25), st]);
    setSt(next);
    setSel(null);
    push(next);
  };

  const undo = () => {
    if (!hist.length) return;
    const prev = hist[hist.length - 1]!;
    setHist((h) => h.slice(0, -1));
    setSt(prev);
    setSel(null);
    push(prev);
  };

  /* ---------- linking ---------- */
  if (link) {
    return (
      <LinkScreen
        link={link}
        status={status}
        onAnswer={async (answer) => {
          /* Only the manual transport ever shows a reply box, so this is
             always the raw connection rather than a PeerJS handle. */
          try { await (peer.current as RTCPeerConnection).setRemoteDescription(unpack(answer)); setStatus("Connecting…"); }
          catch (e) { setStatus("That reply code didn't parse. Copy the whole thing and try again."); }
        }}
        onCancel={() => abort()}
      />
    );
  }

  /* ---------- lobby ---------- */
  if (!st) {
    const startQuickHost = async (a: string, b: string) => {
      names.current = [a || "Host", b || "Guest"];
      setMode("direct"); setSeat(0);
      setLink({ how: "quick", role: "host", step: "working" });
      try {
        peer.current = await quickHost(handlers, (code) =>
          setLink({ how: "quick", role: "host", step: "share", myCode: code }));
      } catch (e) { abort("Couldn't reach the broker. Try swapping codes manually instead."); }
    };

    const startQuickJoin = async (code: string) => {
      setMode("direct"); setSeat(1);
      setLink({ how: "quick", role: "guest", step: "working" });
      try { peer.current = await quickJoin(code, handlers); }
      catch (e) { abort("Couldn't reach the broker. Try swapping codes manually instead."); }
    };

    const startManualHost = async (a: string, b: string) => {
      if (!window.RTCPeerConnection) { setStatus("This browser can't open a direct connection."); return; }
      names.current = [a || "Host", b || "Guest"];
      setMode("direct"); setSeat(0);
      setLink({ how: "manual", role: "host", step: "working" });
      try {
        const { pc, code } = await manualHost(handlers);
        peer.current = pc;
        setLink({ how: "manual", role: "host", step: "share", myCode: code });
      } catch (e) { abort("Couldn't start a direct connection here."); }
    };

    const startManualJoin = async (offer: string) => {
      if (!window.RTCPeerConnection) { setStatus("This browser can't open a direct connection."); return; }
      setMode("direct"); setSeat(1);
      setLink({ how: "manual", role: "guest", step: "working" });
      try {
        const { pc, code } = await manualJoin(offer, handlers);
        peer.current = pc;
        setLink({ how: "manual", role: "guest", step: "share", myCode: code });
      } catch (e) { abort("That invite code didn't parse. Copy the whole thing and try again."); }
    };

    return (
      <Lobby
        status={status}
        quick={quick}
        onLocal={(a, b) => { setMode("local"); setSt(newGame([a, b])); }}
        onQuickHost={startQuickHost}
        onQuickJoin={startQuickJoin}
        onManualHost={startManualHost}
        onManualJoin={startManualJoin}
      />
    );
  }

  const i = st.turn;
  const opp = 1 - i;
  const meView = view(st, i);

  /* ---------- draft ---------- */
  if (st.phase === "draft") {
    const picker = (DRAFT[st.draftStep] + st.first) % 2;
    const yours = mode === "local" || picker === seat;
    return (
      <Shell status={status}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, color: C.ink, fontWeight: 600 }}>Choose wonders</h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: C.muted }}>
          {st.names[picker]} picks. One each, then two, then the last — and the order flips for the second set.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {st.draftPool.map((id) => {
            const w = WON[id];
            return (
              <button key={id} disabled={!yours} onClick={() => { const n = draftPick(clone(st), id); commit(n); }}
                style={{
                  width: 165, textAlign: "left", padding: 10, borderRadius: 8,
                  background: C.panel, border: `1px solid ${C.line}`, color: C.ink,
                  cursor: yours ? "pointer" : "default", opacity: yours ? 1 : .5,
                }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>{w.name}</div>
                <div style={{ marginBottom: 6 }}><CostRow cost={w.cost} /></div>
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.35 }}>{w.text}</div>
                {w.vp > 0 && <div style={{ marginTop: 6 }}><VP n={w.vp} /></div>}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          {[0, 1].map((j) => (
            <div key={j} style={{ flex: 1, background: C.panel, borderRadius: 8, padding: 10, border: `1px solid ${C.line}` }}>
              <b style={{ fontSize: 12, color: C.ink }}>{st.names[j]}</b>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                {st.players[j].wonders.map((w) => WON[w.id].name).join(" · ") || "—"}
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  /* ---------- pending choice ---------- */
  if (st.pending) {
    const pd = st.pending;
    const yours = mode === "local" || pd.player === seat;
    let title = "", options = null;

    if (pd.type === "progress" || pd.type === "library") {
      title = pd.type === "library" ? "Choose a token from the archive" : "You completed a pair — take a token";
      const list = pd.type === "library" ? pd.options : st.board;
      options = (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {list.map((t) => (
            <button key={t} disabled={!yours} onClick={() => commit(resolve(st, t))} style={optBtn(yours)}>
              <b style={{ fontSize: 12.5 }}>{TOK[t].name}</b>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.35 }}>{TOK[t].text}</div>
            </button>
          ))}
        </div>
      );
    }
    if (pd.type === "destroy") {
      title = `Destroy one of ${st.names[1 - pd.player]}'s ${pd.color} cards`;
      options = (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {st.players[1 - pd.player].built.filter((id) => CARD[id].color === pd.color).map((id, k) => (
            <div key={k} onClick={() => yours && commit(resolve(st, id))} style={{ cursor: yours ? "pointer" : "default" }}>
              <CardFace card={CARD[id]} w={74} dim={!yours} />
            </div>
          ))}
        </div>
      );
    }
    if (pd.type === "mausoleum") {
      title = "Raise a card from the discard pile";
      options = (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 340, overflowY: "auto" }}>
          {st.discard.map((id, k) => (
            <div key={k} onClick={() => yours && commit(resolve(st, id))} style={{ cursor: yours ? "pointer" : "default" }}>
              <CardFace card={CARD[id]} w={74} dim={!yours} />
            </div>
          ))}
        </div>
      );
    }
    if (pd.type === "first") {
      title = `${st.names[pd.player]} has the weaker military — choose who starts Age ${["", "I", "II", "III"][pd.next]}`;
      options = (
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1].map((j) => (
            <button key={j} disabled={!yours} onClick={() => commit(resolve(st, j))} style={optBtn(yours)}>
              <b style={{ fontSize: 12.5 }}>{st.names[j]} starts</b>
            </button>
          ))}
        </div>
      );
    }

    return (
      <Shell status={status}>
        <h2 style={{ margin: "0 0 12px", fontSize: 17, color: C.ink, fontWeight: 600 }}>{title}</h2>
        {!yours && <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Waiting for {st.names[pd.player]}…</p>}
        {options}
      </Shell>
    );
  }

  /* ---------- game over ---------- */
  if (st.phase === "over") {
    const a = score(st, 0), b = score(st, 1);
    const w = st.winner!;
    const rows: (keyof ScoreBreakdown)[] = ["military", "blue", "green", "yellow", "guild", "wonders", "tokens", "coins"];
    const label: Record<string, string> = { military: "Military", blue: "Civilian", green: "Science", yellow: "Commercial", guild: "Guilds", wonders: "Wonders", tokens: "Progress", coins: "Treasury" };
    return (
      <Shell status={status}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, color: C.gold, fontWeight: 600 }}>
          {w.p === null ? "A shared victory" : `${st.names[w.p]} wins`}
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: C.muted }}>
          {w.by === "military" ? "Military supremacy." : w.by === "science" ? "Scientific supremacy — six symbols." :
            w.by === "tiebreak" ? "Level on points, decided on civilian buildings." : "Decided on points."}
        </p>
        <table style={{ borderCollapse: "collapse", fontSize: 13, color: C.ink, minWidth: 280 }}>
          <thead><tr>
            <th style={th}></th><th style={th}>{st.names[0]}</th><th style={th}>{st.names[1]}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <td style={{ ...td, color: C.muted }}>{label[r]}</td>
                <td style={td}>{a[r]}</td><td style={td}>{b[r]}</td>
              </tr>
            ))}
            <tr><td style={{ ...td, fontWeight: 700, borderTop: `1px solid ${C.line}` }}>Total</td>
              <td style={{ ...td, fontWeight: 700, borderTop: `1px solid ${C.line}` }}>{a.total}</td>
              <td style={{ ...td, fontWeight: 700, borderTop: `1px solid ${C.line}` }}>{b.total}</td></tr>
          </tbody>
        </table>
        <button onClick={() => { setSt(null); setHist([]); setMode(null); }} style={{ ...btn, marginTop: 20 }}>New game</button>
      </Shell>
    );
  }

  /* ---------- main board ---------- */
  const selSlot = sel !== null ? st.slots.find((s) => s.id === sel) : null;
  const selCard = selSlot && selSlot.card ? CARD[selSlot.card] : null;
  const selCost = selCard ? cardCost(st, i, selCard) : null;
  const yellowN = st.players[i].built.filter((id) => CARD[id].color === "yellow").length;
  const rows = LAYOUTS[st.age].rows;
  const maxRow = Math.max(...rows);

  return (
    <Shell status={status}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: C.ink }}>
          Age {["", "I", "II", "III"][st.age]} · {st.remaining} cards left
        </span>
        <span style={{ fontSize: 13, color: myTurn ? C.gold : C.muted, fontWeight: 600 }}>
          {myTurn ? `${st.names[i]} to play` : `Waiting for ${st.names[i]}`}
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          {mode === "direct" && (
            <span style={{ fontSize: 11, color: linked() ? "#7fc48f" : C.blood, alignSelf: "center" }}>
              {linked() ? "connected" : "disconnected"}
            </span>
          )}
          <button onClick={undo} disabled={!hist.length} style={{ ...btnSm, opacity: hist.length ? 1 : .4 }}>Undo</button>
        </span>
      </div>

      <div style={{ marginBottom: 10 }}><MilitaryTrack st={st} /></div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {st.board.map((t) => <TokenChip key={t} id={t} small />)}
        {!st.board.length && <span style={{ fontSize: 11, color: C.muted }}>all progress tokens claimed</span>}
      </div>

      {/* structure */}
      <div style={{ overflowX: "auto", padding: "4px 0 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: maxRow * 80 }}>
          {rows.map((len, r) => {
            const rowSlots = st.slots.filter((s) => s.row === r);
            const pinch = st.age === 3 && r === 3;
            return (
              <div key={r} style={{ display: "flex", gap: pinch ? 90 : 6, marginTop: r ? -22 : 0 }}>
                {rowSlots.map((s) => {
                  if (s.card === null) return <div key={s.id} style={{ width: 74, height: 100 }} />;
                  if (!s.up || s.card === "?") return <CardBack key={s.id} />;
                  const card = CARD[s.card];
                  const open = isOpen(st.slots, s);
                  const cst = open ? cardCost(st, i, card) : null;
                  return (
                    <CardFace
                      key={s.id}
                      card={card}
                      selected={sel === s.id}
                      dim={!open}
                      onClick={open && myTurn ? () => setSel(sel === s.id ? null : s.id) : undefined}
                      cost={cst ? { ...cst, affordable: cst.total <= st.players[i].coins } : null}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* action bar */}
      {selCard && selCost && sel !== null && myTurn && (
        <div style={{ background: C.panel, border: `1px solid ${C.gold}66`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <b style={{ fontSize: 14, color: C.ink }}>{selCard.name}</b>
            <span style={{ fontSize: 12, color: C.muted }}>
              {selCost.chained ? "free by chain" : selCost.total === 0 ? "free" : `${selCost.total} coins`}
              {selCost.trade > 0 && ` (${selCost.trade} on trade)`}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              disabled={selCost.total > st.players[i].coins}
              onClick={() => commit(actBuild(st, sel))}
              style={{ ...btn, opacity: selCost.total > st.players[i].coins ? .4 : 1 }}
            >Build</button>
            <button onClick={() => commit(actDiscard(st, sel))} style={btn}>
              Discard for {2 + yellowN}c
            </button>
            {st.players[i].wonders.filter((w) => !w.built).map((w) => {
              const wc = wonderCost(st, i, WON[w.id]);
              const ok = wc.total <= st.players[i].coins;
              return (
                <button key={w.id} disabled={!ok} onClick={() => commit(actWonder(st, sel, w.id))}
                  style={{ ...btn, background: C.panel2, opacity: ok ? 1 : .4 }}>
                  {WON[w.id].name} · {wc.total ? `${wc.total}c` : "free"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10 }}>
        <City st={st} i={mode === "direct" ? seat : 0} me={mode === "direct"} />
        <City st={st} i={mode === "direct" ? 1 - seat : 1} />
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 12, color: C.muted, cursor: "pointer" }}>Move log · discard ({st.discard.length})</summary>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.7, maxHeight: 160, overflowY: "auto" }}>
          {[...st.log].reverse().map((l, k) => <div key={k}>{l}</div>)}
        </div>
      </details>
    </Shell>
  );
}

/* ============================================================
   RULES REFERENCE
   Generated from the data above wherever possible, so editing a
   token, wonder or chain updates the rules panel automatically.
   ============================================================ */
const Sec = ({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details open={open} style={{ borderBottom: `1px solid ${C.line}` }}>
    <summary style={{
      cursor: "pointer", padding: "11px 2px", fontSize: 13.5, fontWeight: 600,
      color: C.ink, listStyle: "revert",
    }}>{title}</summary>
    <div style={{ padding: "0 2px 14px", fontSize: 12.5, lineHeight: 1.65, color: C.muted }}>
      {children}
    </div>
  </details>
);

const Row = ({ head, children }: { head: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 7 }}>
    <div style={{ minWidth: 108, color: C.ink, fontWeight: 500 }}>{head}</div>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

function StructureDots({ age }: { age: Age }) {
  const { rows, up } = LAYOUTS[age];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, margin: "6px 0 10px" }}>
      {rows.map((n, r) => (
        <div key={r} style={{ display: "flex", gap: age === 3 && r === 3 ? 26 : 3 }}>
          {Array.from({ length: n }, (_, k) => (
            <span key={k} style={{
              width: 11, height: 15, borderRadius: 2,
              background: up.includes(r) ? C.muted : "transparent",
              border: `1px solid ${C.muted}`,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RulesPanel({ onClose }: { onClose: () => void }) {
  const guilds = CARDS.filter((k) => k.color === "purple");
  const chains = CARDS.filter((k) => k.chainFrom);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 90,
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.board, width: "min(460px, 100%)", height: "100%",
          overflowY: "auto", padding: "0 16px 40px", borderLeft: `1px solid ${C.line}`,
          boxShadow: "-8px 0 24px rgba(0,0,0,.4)",
        }}
      >
        <div style={{
          position: "sticky", top: 0, background: C.board, paddingTop: 16, paddingBottom: 10,
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderBottom: `1px solid ${C.line}`, zIndex: 2,
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.ink }}>Rules</h2>
          <button onClick={onClose} style={{ ...btnSm, padding: "4px 12px" }}>Close</button>
        </div>

        <Sec title="Winning" open>
          <Row head="Military">Push the pawn into your opponent's capital. Ends the game at once.</Row>
          <Row head="Science">Collect 6 different symbols. Ends the game at once.</Row>
          <Row head="Points">If neither happens, the higher score after Age III wins.</Row>
        </Sec>

        <Sec title="Your turn" open>
          Take any card that nothing else covers, then do one of three things with it:
          <div style={{ marginTop: 8 }}>
            <Row head="Build it">Pay the cost and add it to your city.</Row>
            <Row head="Discard it">Take 2 coins, plus 1 for every yellow card you already own.</Row>
            <Row head="Bury it">Pay a <i>Wonder's</i> cost instead and slide the card under it. The card itself does nothing.</Row>
          </div>
          Only 7 Wonders can ever be built. When the 7th goes up, the last unbuilt one is gone.
        </Sec>

        <Sec title="Paying for things">
          <Row head="Trade price">
            Each resource you're missing costs <b style={{ color: C.gold }}>2 + the number your opponent
            produces</b> from their brown and grey cards. The coins go to the bank, not to them.
          </Row>
          <Row head="Not counted">Resources from yellow cards and Wonders never raise your opponent's prices.</Row>
          <Row head="Chains">
            A chain link makes a card completely free — cost ignored entirely.
          </Row>
          <Row head="Discounts">
            Masonry waives 2 resources on blue cards, Architecture 2 on Wonders. You pick which,
            so waive the expensive ones.
          </Row>
          <div style={{ marginTop: 6, color: C.ink, fontSize: 12 }}>
            The number in the corner of each available card is what it costs <i>you</i>, right now,
            with all of this already worked out.
          </div>
        </Sec>

        <Sec title="Military">
          Every shield moves the pawn one space toward your opponent. Crossing into a zone with a
          looting token costs your opponent 2 or 5 coins, once only, and the token is then gone.
          <div style={{ marginTop: 8 }}>
            <Row head="1–2 spaces">2 victory points at the end</Row>
            <Row head="3–5 spaces">5 victory points</Row>
            <Row head="6–8 spaces">10 victory points</Row>
            <Row head="9 spaces">Immediate victory</Row>
          </div>
          Only the leading player scores. Strategy adds a shield to red <i>cards</i>, never to Wonders.
        </Sec>

        <Sec title="Science">
          Two matching symbols earns you a progress token straight away. Six different symbols wins
          the game outright.
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {(Object.keys(SCI) as ScienceSymbol[]).map((k) => {
              const n = CARDS.filter((x) => x.sci === k).length;
              return (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <SciMark k={k} size={15} />
                  <span style={{ fontSize: 11 }}>{k} ×{n}</span>
                </span>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5 }}>
            Two symbols appear on only one card each, so they can never be paired — but they still
            count toward the six you need.
          </div>
        </Sec>

        <Sec title="Progress tokens">
          Five are available each game; the other five sit in the archive, reachable only through
          the Great Library.
          <div style={{ marginTop: 8 }}>
            {TOKENS.map((t) => <Row key={t.id} head={t.name}>{t.text}</Row>)}
          </div>
        </Sec>

        <Sec title="Wonders">
          {WONDERS.map((w) => (
            <div key={w.id} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ color: C.ink, fontWeight: 500 }}>{w.name}</span>
                <CostRow cost={w.cost} size={11} />
                {w.vp > 0 && <VP n={w.vp} />}
                {(w.shields ?? 0) > 0 && <Shield n={w.shields!} />}
              </div>
              <div style={{ fontSize: 11.5 }}>{w.text}</div>
            </div>
          ))}
        </Sec>

        <Sec title="Guilds">
          Guilds count against whichever city has more — which is often your opponent's. Coins are
          taken once, when you build it; the points come at the end.
          <div style={{ marginTop: 8 }}>
            {guilds.map((g) => (
              <Row key={g.id} head={g.name.replace(" Guild", "")}>
                {g.guild!.treasury ? "1 VP per 3 coins in the richest treasury"
                  : g.guild!.wonders ? "2 VP per Wonder built by whoever has the most"
                  : `1 coin and 1 VP per ${(g.guild!.colors ?? []).join(" or ")} card`}
              </Row>
            ))}
          </div>
        </Sec>

        <Sec title="Chain links">
          Own the card on the left and the card on the right is free.
          <div style={{ marginTop: 8, columnCount: 1 }}>
            {chains.map((k) => (
              <div key={k.id} style={{ marginBottom: 4 }}>
                <span style={{ color: C.ink }}>{CARD[k.chainFrom!].name}</span>
                <span style={{ margin: "0 6px", color: "#5a8a4a" }}>⛓</span>
                <span style={{ color: C.ink }}>{k.name}</span>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="The three structures">
          Filled squares start face up. Lower rows sit on top, so the bottom row is what you can
          reach first. Eight cards start hidden in every age.
          {([1, 2, 3] as Age[]).map((a) => (
            <div key={a}>
              <div style={{ color: C.ink, marginTop: 8 }}>Age {["", "I", "II", "III"][a]}</div>
              <StructureDots age={a} />
            </div>
          ))}
        </Sec>

        <Sec title="Between ages">
          The player with the <i>weaker</i> military chooses who starts the next age — they choose,
          they don't automatically go first. If the pawn is dead centre, whoever took the last card
          of the previous age decides.
        </Sec>

        <Sec title="Scoring">
          <Row head="Military">0, 2, 5 or 10 by the pawn's final zone</Row>
          <Row head="Blue">Civilian buildings</Row>
          <Row head="Green">Scientific buildings</Row>
          <Row head="Yellow">Commercial buildings</Row>
          <Row head="Purple">Guilds</Row>
          <Row head="Wonders">Built Wonders only</Row>
          <Row head="Progress">Tokens, plus 3 each if you hold Mathematics</Row>
          <Row head="Treasury">1 point per 3 coins, rounded down</Row>
          <div style={{ marginTop: 6 }}>
            Level on points? Most points from blue cards wins. Still level and it's a shared victory.
          </div>
        </Sec>

        <Sec title="Easy to miss">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.75 }}>
            <li>Resources are permanent production, not a pool you spend down.</li>
            <li>A Wonder producing stone doesn't make your opponent's stone any pricier.</li>
            <li>A chain beats even a cheap cost, and pays 4 coins if you hold Urbanism.</li>
            <li>Strategy affects red cards built afterwards — never Wonders, never earlier cards.</li>
            <li>A play again triggered on the last card of an age is wasted.</li>
            <li>The Mausoleum can't reach cards removed during setup, only ones discarded in play.</li>
            <li>Guilds can score off your opponent's city, so denying one is sometimes worth more than taking it.</li>
            <li>Looting tokens fire once and leave the game, in either direction.</li>
          </ul>
        </Sec>
      </div>
    </div>
  );
}

/* ============================================================
   CHROME
   ============================================================ */
const btn: React.CSSProperties = {
  background: C.gold, color: "#2a2109", border: "none", borderRadius: 6,
  padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const btnSm: React.CSSProperties = { ...btn, background: C.panel2, color: C.ink, padding: "4px 10px", fontSize: 11.5 };
const optBtn = (on: boolean): React.CSSProperties => ({
  width: 190, textAlign: "left", padding: 10, borderRadius: 8,
  background: C.panel, border: `1px solid ${C.line}`, color: C.ink,
  cursor: on ? "pointer" : "default", opacity: on ? 1 : .5,
});
const th: React.CSSProperties = { textAlign: "right", padding: "4px 12px", fontSize: 11, color: C.muted, fontWeight: 600 };
const td: React.CSSProperties = { textAlign: "right", padding: "4px 12px" };

function Shell({ children, status }: { children: React.ReactNode; status?: string }) {
  const [rules, setRules] = useState(false);
  return (
    <div style={{
      background: C.board, minHeight: "100vh", padding: 14, color: C.ink,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 56 }}>
        {status && <div style={{
          background: "#4a3a1e", border: `1px solid ${C.gold}55`, color: C.ink,
          padding: "6px 10px", borderRadius: 6, fontSize: 12, marginBottom: 10,
        }}>{status}</div>}
        {children}
      </div>

      <button
        onClick={() => setRules(true)}
        aria-label="Open the rules"
        style={{
          position: "fixed", right: 16, bottom: 16, zIndex: 80,
          background: C.panel2, color: C.ink, border: `1px solid ${C.line}`,
          borderRadius: 20, padding: "8px 16px", fontSize: 12.5, fontWeight: 600,
          cursor: "pointer", boxShadow: "0 3px 10px rgba(0,0,0,.45)",
        }}
      >Rules</button>

      {rules && <RulesPanel onClose={() => setRules(false)} />}
    </div>
  );
}

function CodeBox({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code).then(
              () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
              () => setCopied(false)
            );
          }}
          style={{ ...btnSm, padding: "3px 10px" }}
        >{copied ? "Copied" : "Copy"}</button>
      </div>
      <textarea
        readOnly
        value={code}
        onFocus={(e) => e.target.select()}
        style={{
          width: "100%", height: 78, boxSizing: "border-box", resize: "vertical",
          background: "#16232a", border: `1px solid ${C.line}`, color: C.muted,
          borderRadius: 6, padding: 8, fontSize: 10, fontFamily: "ui-monospace, monospace",
          wordBreak: "break-all",
        }}
      />
    </div>
  );
}

interface LinkScreenProps {
  link: LinkStep;
  status: string;
  onAnswer: (answer: string) => void;
  onCancel: () => void;
}

function LinkScreen({ link, status, onAnswer, onCancel }: LinkScreenProps) {
  const [reply, setReply] = useState("");
  const host = link.role === "host";
  const area: React.CSSProperties = {
    background: C.panel2, border: `1px solid ${C.line}`, color: C.ink,
    borderRadius: 6, padding: 8, fontSize: 11, width: "100%", boxSizing: "border-box",
    fontFamily: "ui-monospace, monospace", height: 78, resize: "vertical",
  };

  if (link.step === "working") {
    return (
      <Shell status={status}>
        <div style={{ maxWidth: 460, margin: "60px auto", textAlign: "center", color: C.muted, fontSize: 13 }}>
          {link.how === "quick" && !host ? "Connecting…" : "Preparing the connection…"}
        </div>
      </Shell>
    );
  }

  /* ---- quick: just show the code and wait ---- */
  if (link.how === "quick") {
    return (
      <Shell status={status}>
        <div style={{ maxWidth: 420, margin: "50px auto", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 18px" }}>
            Give her this code. The board opens as soon as she joins.
          </p>
          <div style={{
            fontSize: 40, fontWeight: 700, letterSpacing: 6, color: C.gold,
            fontFamily: "ui-monospace, monospace", padding: "18px 0",
            background: C.panel, borderRadius: 10, border: `1px solid ${C.line}`,
          }}>{link.myCode}</div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 18 }}>Waiting for her to join…</p>
          <button onClick={onCancel} style={{ ...btnSm, marginTop: 20 }}>Cancel</button>
        </div>
      </Shell>
    );
  }

  /* ---- manual: swap descriptors by hand ---- */
  return (
    <Shell status={status}>
      <div style={{ maxWidth: 460, margin: "30px auto" }}>
        <h2 style={{ fontSize: 19, margin: "0 0 6px", fontWeight: 600 }}>
          {host ? "Send her this" : "Send this back"}
        </h2>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 20px", lineHeight: 1.55 }}>
          {host
            ? "She pastes this into Join, sends you her reply code, and you paste that below."
            : "Paste this into the message thread. Once the host enters it, the board opens by itself."}
        </p>

        <CodeBox code={link.myCode ?? ""} label={host ? "Your invite code" : "Your reply code"} />

        {host ? (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Her reply code</div>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder="Paste it here" style={area} />
            <button onClick={() => reply.trim() && onAnswer(reply)}
              style={{ ...btn, marginTop: 10, opacity: reply.trim() ? 1 : .4 }}>Connect</button>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 18 }}>Waiting for the host to connect…</p>
        )}

        <button onClick={onCancel} style={{ ...btnSm, marginTop: 24 }}>Cancel</button>
      </div>
    </Shell>
  );
}

interface LobbyProps {
  onLocal: (a: string, b: string) => void;
  onQuickHost: (a: string, b: string) => void;
  onQuickJoin: (code: string) => void;
  onManualHost: (a: string, b: string) => void;
  onManualJoin: (offer: string) => void;
  status: string;
  quick: QuickProbe;
}

function Lobby({ onLocal, onQuickHost, onQuickJoin, onManualHost, onManualJoin, status, quick }: LobbyProps) {
  const [a, setA] = useState("Player 1");
  const [b, setB] = useState("Player 2");
  const [tab, setTab] = useState("code");     // 'code' | 'paste'
  const [code, setCode] = useState("");
  const [offer, setOffer] = useState("");
  const [joining, setJoining] = useState(false);

  const inp: React.CSSProperties = {
    background: C.panel2, border: `1px solid ${C.line}`, color: C.ink,
    borderRadius: 6, padding: "8px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
  };
  const tabBtn = (on: boolean): React.CSSProperties => ({
    ...btnSm, background: on ? C.gold : C.panel2, color: on ? "#2a2109" : C.muted,
    borderRadius: 5, padding: "5px 12px",
  });

  return (
    <Shell status={status}>
      <div style={{ maxWidth: 440, margin: "40px auto" }}>
        <h1 style={{ fontSize: 26, margin: "0 0 6px", fontWeight: 600, letterSpacing: -0.3 }}>Duel</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 26px", lineHeight: 1.5 }}>
          Three ages, two cities. Win by military, by science, or on points.
        </p>

        <div style={{ background: C.panel, borderRadius: 8, padding: 16, border: `1px solid ${C.line}`, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Same screen</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={a} onChange={(e) => setA(e.target.value)} style={inp} />
            <input value={b} onChange={(e) => setB(e.target.value)} style={inp} />
          </div>
          <button onClick={() => onLocal(a || "Player 1", b || "Player 2")} style={btn}>Start</button>
        </div>

        <div style={{ background: C.panel, borderRadius: 8, padding: 16, border: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Separate devices</span>
            {quick === "ready" && (
              <span style={{ display: "flex", gap: 5 }}>
                <button onClick={() => setTab("code")} style={tabBtn(tab === "code")}>Code</button>
                <button onClick={() => setTab("paste")} style={tabBtn(tab === "paste")}>Paste</button>
              </span>
            )}
          </div>

          <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.55 }}>
            {quick === "checking" && "Checking what's available…"}
            {quick === "no" && "Swap one code each to introduce the browsers. Nothing is stored anywhere, and no server is involved."}
            {quick === "ready" && (tab === "code"
              ? "A broker introduces the two browsers, then steps out. Game data always goes browser to browser."
              : "No third party at all — you carry the introduction across yourself by text.")}
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={a} onChange={(e) => setA(e.target.value)} style={inp} placeholder="Your name" />
            <input value={b} onChange={(e) => setB(e.target.value)} style={inp} placeholder="Her name" />
          </div>

          {quick === "ready" && tab === "code" ? (
            <>
              <button onClick={() => onQuickHost(a, b)} style={btn}>Create a game</button>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ ...inp, letterSpacing: 3, fontFamily: "ui-monospace, monospace" }}
                  placeholder="CODE" maxLength={5} />
                <button onClick={() => code.trim() && onQuickJoin(code)}
                  style={{ ...btnSm, whiteSpace: "nowrap", opacity: code.trim() ? 1 : .4 }}>Join</button>
              </div>
            </>
          ) : !joining ? (
            <>
              <button onClick={() => onManualHost(a, b)} style={btn}>Create an invite</button>
              <button onClick={() => setJoining(true)} style={{ ...btnSm, marginLeft: 8 }}>I have an invite</button>
            </>
          ) : (
            <>
              <textarea value={offer} onChange={(e) => setOffer(e.target.value)}
                placeholder="Paste the invite code"
                style={{ ...inp, height: 78, fontSize: 11, resize: "vertical", fontFamily: "ui-monospace, monospace", marginBottom: 10 }} />
              <button onClick={() => offer.trim() && onManualJoin(offer)}
                style={{ ...btn, opacity: offer.trim() ? 1 : .4 }}>Join</button>
              <button onClick={() => setJoining(false)} style={{ ...btnSm, marginLeft: 8 }}>Back</button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
