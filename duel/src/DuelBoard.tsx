import React, { useState, useEffect, useRef } from "react";
import { C, CARDCOL, FONT, G, RES, RESCOL, RESLET, SCI, SHADOW, pipFill, shade } from "./theme.ts";
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
  <span title={r} style={{
    width: size, height: size, borderRadius: "50%", background: pipFill(RESCOL[r]),
    boxShadow: `0 0 0 1px ${shade(RESCOL[r], -40)}, 0 1px 1px rgba(0,0,0,.45), inset 0 -1px 2px rgba(0,0,0,.3)`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.6, fontWeight: 800, color: "rgba(20,18,12,.82)", lineHeight: 1,
    textShadow: "0 1px 0 rgba(255,255,255,.22)", flex: "0 0 auto",
  }}>{RESLET[r]}</span>
);

const Coin = ({ n, size = 14 }: { n: number; size?: number }) => (
  <span style={{
    minWidth: size, height: size, padding: "0 3px", borderRadius: size,
    background: "radial-gradient(circle at 34% 26%, #f6dc9c 0%, #dcb15c 45%, #b98c39 100%)",
    boxShadow: "0 0 0 1px #8f6a26, 0 1px 1px rgba(0,0,0,.45), inset 0 -1px 2px rgba(0,0,0,.25)",
    color: "#2f2409", fontSize: size * 0.64, fontWeight: 800,
    display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
    textShadow: "0 1px 0 rgba(255,255,255,.3)", flex: "0 0 auto",
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
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}
      style={{ display: "block", filter: `drop-shadow(0 1px 1px rgba(0,0,0,.45))`, flex: "0 0 auto" }}>
      {paths[shape]}
    </svg>
  );
}

const Shield = ({ n }: { n: number }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
    <svg width="13" height="14" viewBox="0 0 13 14" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.5))", flex: "0 0 auto" }}>
      <defs>
        <linearGradient id="shieldG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(C.blood, 12)} />
          <stop offset="1" stopColor={shade(C.blood, -14)} />
        </linearGradient>
      </defs>
      <path d="M6.5 0 13 2.5v5C13 11 9.5 13.3 6.5 14 3.5 13.3 0 11 0 7.5v-5z" fill="url(#shieldG)" />
      <path d="M6.5 1.2 11.8 3.2v4.3c0 2.6-2.8 4.5-5.3 5.1z" fill="rgba(255,255,255,.12)" />
    </svg>
    {n > 1 && <b style={{ fontSize: 11, color: C.blood }}>{n}</b>}
  </span>
);

const VP = ({ n }: { n: number }) => (
  <span title={`${n} victory points`} style={{
    width: 17, height: 17, borderRadius: 3,
    background: `linear-gradient(180deg, ${shade(CARDCOL.blue, 10)}, ${shade(CARDCOL.blue, -12)})`,
    boxShadow: `0 0 0 1px ${shade(CARDCOL.blue, -26)}, 0 1px 1px rgba(0,0,0,.4)`,
    color: "#fff", textShadow: "0 1px 1px rgba(0,0,0,.4)",
    fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center",
    flex: "0 0 auto",
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
/* Card banner height. Fixed, because the cost badge is positioned under it. */
const HEAD = 24;

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
      title={card.name}
      className={`duel-card${onClick ? " is-live" : ""}${selected ? " is-sel" : ""}`}
      style={{
        width: w, height: w * 1.36, borderRadius: 7, padding: 0, cursor: onClick ? "pointer" : "default",
        background: G.card, border: `1px solid ${selected ? C.gold : "rgba(0,0,0,.5)"}`,
        boxShadow: selected
          ? `0 0 0 3px ${C.gold}66, 0 0 18px -2px ${C.gold}55, ${SHADOW.cardUp}`
          : SHADOW.card,
        opacity: dim ? 0.55 : 1, filter: dim ? "saturate(.55) brightness(.62)" : "none",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", textAlign: "left",
        /* Filtering by colour is most of reading the board, so every card
           carries a full-height tint of its own family behind the art. */
        backgroundImage: `linear-gradient(180deg, ${col}22 0%, ${col}00 38%), ${G.card}`,
      }}
    >
      <div style={{
        background: `linear-gradient(180deg, ${shade(col, 9)} 0%, ${col} 62%, ${shade(col, -12)} 100%)`,
        padding: "3px 4px", height: HEAD, boxSizing: "border-box", flex: "0 0 auto",
        display: "flex", alignItems: "center",
        borderBottom: "1px solid rgba(0,0,0,.28)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.22)",
      }}>
        <div style={{
          fontSize: 8.5, fontWeight: 700, color: "#fff", lineHeight: 1.12, letterSpacing: .2,
          textShadow: "0 1px 1px rgba(0,0,0,.45)",
          /* Two lines fits every name in the deck; clamping keeps the banner a
             fixed height so the cost badge below it never collides. */
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
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
      <div style={{
        padding: "2px 3px", minHeight: 18, display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(120,104,66,.28)", background: "rgba(120,104,66,.09)",
      }}>
        <CostRow cost={card.cost} size={11} />
        {card.chainFrom && (
          <span title={`Free if you own ${CARD[card.chainFrom].name}`}
            style={{ fontSize: 12, color: "#4f7f40", lineHeight: 1, flex: "0 0 auto" }}>⛓</span>
        )}
      </div>
      {cost && (
        <div style={{
          position: "absolute", top: HEAD, right: 0,
          background: cost.chained
            ? "linear-gradient(180deg, #5aa06b, #3f7a4e)"
            : cost.affordable ? G.gold : `linear-gradient(180deg, ${shade(C.blood, 8)}, ${shade(C.blood, -12)})`,
          color: cost.chained || !cost.affordable ? "#fff" : "#2a2109",
          textShadow: cost.chained || !cost.affordable ? "0 1px 1px rgba(0,0,0,.4)" : "none",
          fontSize: 10, fontWeight: 800, padding: "1px 5px", borderRadius: "0 0 0 5px",
          boxShadow: "0 1px 3px rgba(0,0,0,.45)",
        }}>{cost.chained ? "free" : cost.total}</div>
      )}
    </button>
  );
}

/* The face-down back. A medallion rather than hatching, so a covered card
   reads as a card at a glance instead of as a texture swatch. */
const CardBack = ({ w = 74 }: { w?: number }) => (
  <div style={{
    width: w, height: w * 1.36, borderRadius: 7, position: "relative", overflow: "hidden",
    background: `linear-gradient(160deg, #35555e 0%, #294249 55%, #1f333a 100%)`,
    border: "1px solid rgba(0,0,0,.5)", boxShadow: SHADOW.card,
  }}>
    <div style={{
      position: "absolute", inset: 4, borderRadius: 4,
      border: `1px solid ${C.gold}30`,
      background: `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,.028) 6px, rgba(255,255,255,.028) 12px)`,
    }} />
    <svg viewBox="0 0 40 40" width="52%" style={{
      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: .5,
    }}>
      <circle cx="20" cy="20" r="15" fill="none" stroke={C.gold} strokeWidth="1.1" />
      <circle cx="20" cy="20" r="10.5" fill="none" stroke={C.gold} strokeWidth=".7" opacity=".7" />
      <path d="M20 7 L26 20 L20 33 L14 20 Z" fill={C.gold} opacity=".55" />
      <circle cx="20" cy="20" r="2.6" fill={C.gold} opacity=".85" />
    </svg>
  </div>
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
        flex: 1, minWidth: 0, height: 26, position: "relative",
        background: zone === "cap"
          ? `linear-gradient(180deg, ${shade(C.blood, 6)}, ${shade(C.blood, -16)})`
          : zone === "mid"
            ? `linear-gradient(180deg, ${C.panel2}, ${shade(C.panel2, -6)})`
            : `linear-gradient(180deg, rgba(184,69,60,${abs <= 2 ? .14 : abs <= 5 ? .28 : .46}), rgba(184,69,60,${abs <= 2 ? .07 : abs <= 5 ? .16 : .3}))`,
        borderRight: v < 9 ? `1px solid rgba(0,0,0,.32)` : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {lootHere && (
          <span title={`Crossing here costs the loser ${abs === 3 ? 2 : 5} coins`} style={{
            fontSize: 9, color: "#2f2409", fontWeight: 800, padding: "1px 4px", borderRadius: 8,
            background: G.gold, boxShadow: "0 1px 2px rgba(0,0,0,.5)",
          }}>−{abs === 3 ? 2 : 5}</span>
        )}
        {here && <div className="duel-pawn" style={{
          position: "absolute", width: 17, height: 17, borderRadius: "50%",
          background: "radial-gradient(circle at 34% 28%, #ffffff 0%, #ece7d8 45%, #b9b3a2 100%)",
          border: `2px solid rgba(0,0,0,.55)`,
          boxShadow: `0 2px 5px rgba(0,0,0,.7), 0 0 12px ${C.ink}55`,
        }} />}
      </div>
    );
  }
  const lead = st.conflict === 0 ? null : st.conflict > 0 ? 0 : 1;
  return (
    <div>
      <div style={{
        display: "flex", borderRadius: 6, overflow: "hidden",
        border: `1px solid rgba(0,0,0,.5)`, boxShadow: SHADOW.sunk,
      }}>{cells}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
        <span style={{ letterSpacing: .3 }}>{st.names[0]}</span>
        <span style={{ color: lead === null ? C.muted : C.gold, fontWeight: lead === null ? 400 : 600 }}>
          {lead === null ? "even" : `${st.names[lead]} +${milVP(Math.abs(st.conflict))} VP`}
        </span>
        <span style={{ letterSpacing: .3 }}>{st.names[1]}</span>
      </div>
    </div>
  );
}

function TokenChip({ id, onClick, small }: { id: string; onClick?: () => void; small?: boolean }) {
  const t = TOK[id];
  return (
    <button onClick={onClick} title={t.text} className={onClick ? "duel-chip is-live" : "duel-chip"} style={{
      background: "linear-gradient(180deg, #477056 0%, #375c46 100%)",
      border: `1px solid #5c8a6d`, color: "#e6f2e8",
      borderRadius: 999, padding: small ? "2px 8px" : "4px 11px", fontSize: small ? 9.5 : 11,
      fontWeight: 500, letterSpacing: .2,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.13), 0 1px 3px rgba(0,0,0,.4)",
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
  const active = st.turn === i && st.phase === "play";
  return (
    <div style={{
      background: G.panel, borderRadius: 10, padding: 12,
      border: `1px solid ${active ? `${C.gold}55` : C.line}`,
      boxShadow: active ? `${SHADOW.panel}, 0 0 0 1px ${C.gold}22` : SHADOW.panel,
      transition: "border-color .2s, box-shadow .2s",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.line}88`,
      }}>
        <span style={{
          fontFamily: FONT.display, fontWeight: 600, fontSize: 15, letterSpacing: .4,
          color: active ? C.gold : C.ink, display: "flex", alignItems: "center", gap: 7,
        }}>
          {active && <span className="duel-pulse" style={{
            width: 7, height: 7, borderRadius: "50%", background: C.gold,
            boxShadow: `0 0 8px ${C.gold}`, flex: "0 0 auto",
          }} />}
          {st.names[i]}{me ? " (you)" : ""}
        </span>
        <span style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12, color: C.muted }}>
          <Coin n={v.p.coins} size={17} />
          {v.shields > 0 && <Shield n={v.shields} />}
          <span style={{ color: C.ink, fontWeight: 600 }}>
            {sc.total} <span style={{ color: C.muted, fontWeight: 400 }}>VP</span>
          </span>
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
            fontSize: 9.5, padding: "3px 7px", borderRadius: 5,
            background: w.built
              ? "linear-gradient(180deg, #7b6842 0%, #5d4e2f 100%)"
              : G.panel2,
            border: `1px solid ${w.built ? `${C.gold}99` : C.line}`,
            color: w.built ? "#f4ecd8" : C.muted,
            boxShadow: w.built
              ? `inset 0 1px 0 rgba(255,255,255,.14), 0 0 10px -3px ${C.gold}77`
              : "inset 0 1px 0 rgba(255,255,255,.05)",
            display: "flex", alignItems: "center", gap: 5,
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
            <span key={g} style={{
              display: "flex", gap: 4, alignItems: "center", borderRadius: 5, padding: "2px 6px",
              background: `linear-gradient(180deg, ${CARDCOL[g]}22, rgba(0,0,0,.26))`,
              border: `1px solid ${CARDCOL[g]}3a`,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 2, flex: "0 0 auto",
                background: `linear-gradient(180deg, ${shade(CARDCOL[g], 10)}, ${shade(CARDCOL[g], -12)})`,
                boxShadow: `0 0 0 1px rgba(0,0,0,.35)`,
              }} />
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
        <h2 style={{
          margin: "0 0 4px", fontSize: 24, color: C.ink, fontWeight: 600,
          fontFamily: FONT.display, letterSpacing: .5,
        }}>Choose wonders</h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: C.muted }}>
          {st.names[picker]} picks. One each, then two, then the last — and the order flips for the second set.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {st.draftPool.map((id) => {
            const w = WON[id];
            return (
              <button key={id} disabled={!yours} onClick={() => { const n = draftPick(clone(st), id); commit(n); }}
                className={yours ? "duel-card is-live" : "duel-card"}
                style={{
                  width: 172, textAlign: "left", padding: 12, borderRadius: 10,
                  background: G.panel, color: C.ink,
                  border: `1px solid ${C.line}`, borderTop: `2px solid ${C.gold}77`,
                  boxShadow: SHADOW.panel,
                  cursor: yours ? "pointer" : "default", opacity: yours ? 1 : .45,
                  /* A button centres its content in the box; these sit in a row of
                     equal-height cards, so the text has to start at the top. */
                  display: "flex", flexDirection: "column", alignItems: "stretch",
                }}>
                <div style={{
                  fontFamily: FONT.display, fontWeight: 600, fontSize: 13.5, marginBottom: 8,
                  letterSpacing: .3, lineHeight: 1.25, color: C.ink,
                }}>{w.name}</div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7, marginBottom: 8,
                  paddingBottom: 8, borderBottom: `1px solid ${C.line}66`,
                }}>
                  <CostRow cost={w.cost} />
                  {w.vp > 0 && <span style={{ marginLeft: "auto" }}><VP n={w.vp} /></span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.45 }}>{w.text}</div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          {[0, 1].map((j) => (
            <div key={j} style={{
              flex: 1, background: G.panel, borderRadius: 10, padding: 12,
              border: `1px solid ${C.line}`, boxShadow: SHADOW.panel,
            }}>
              <b style={{
                fontFamily: FONT.display, fontSize: 13, color: C.ink, letterSpacing: .3,
              }}>{st.names[j]}</b>
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
        <h2 style={{
          margin: "0 0 12px", fontSize: 21, color: C.ink, fontWeight: 600,
          fontFamily: FONT.display, letterSpacing: .4,
        }}>{title}</h2>
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
        <h2 className="duel-fade" style={{
          margin: "0 0 6px", fontSize: 38, color: C.gold, fontWeight: 700,
          fontFamily: FONT.display, letterSpacing: 1,
          textShadow: `0 0 34px ${C.gold}55`,
        }}>
          {w.p === null ? "A shared victory" : `${st.names[w.p]} wins`}
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: C.muted }}>
          {w.by === "military" ? "Military supremacy." : w.by === "science" ? "Scientific supremacy — six symbols." :
            w.by === "tiebreak" ? "Level on points, decided on civilian buildings." : "Decided on points."}
        </p>
        <table style={{
          borderCollapse: "collapse", fontSize: 13, color: C.ink, minWidth: 320,
          background: G.panel, border: `1px solid ${C.line}`, borderRadius: 10,
          boxShadow: SHADOW.panel, overflow: "hidden",
        }}>
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
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, gap: 10, flexWrap: "wrap",
        background: G.panel, border: `1px solid ${C.line}`, borderRadius: 10,
        padding: "8px 12px", boxShadow: SHADOW.panel,
      }}>
        <span style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 9 }}>
          <b style={{
            fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.gold, letterSpacing: 1,
          }}>AGE {["", "I", "II", "III"][st.age]}</b>
          <span style={{ width: 1, height: 13, background: C.line }} />
          {st.remaining} cards left
        </span>
        <span style={{
          fontSize: 13, color: myTurn ? C.gold : C.muted, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 7,
        }}>
          {myTurn && <span className="duel-pulse" style={{
            width: 7, height: 7, borderRadius: "50%", background: C.gold,
            boxShadow: `0 0 8px ${C.gold}`, flex: "0 0 auto",
          }} />}
          {myTurn ? `${st.names[i]} to play` : `Waiting for ${st.names[i]}`}
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          {mode === "direct" && (
            <span style={{
              fontSize: 10.5, alignSelf: "center", display: "flex", alignItems: "center", gap: 5,
              color: linked() ? "#8fd0a0" : "#e08b84",
              background: linked() ? "rgba(90,160,107,.14)" : "rgba(184,69,60,.16)",
              border: `1px solid ${linked() ? "rgba(90,160,107,.4)" : "rgba(184,69,60,.45)"}`,
              borderRadius: 999, padding: "3px 9px",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flex: "0 0 auto",
                background: linked() ? "#8fd0a0" : "#e08b84",
                boxShadow: `0 0 6px ${linked() ? "#8fd0a0" : "#e08b84"}`,
              }} />
              {linked() ? "connected" : "disconnected"}
            </span>
          )}
          <button onClick={undo} disabled={!hist.length} style={{ ...btnSm, opacity: hist.length ? 1 : .4 }}>Undo</button>
        </span>
      </div>

      <div style={{ marginBottom: 10 }}><MilitaryTrack st={st} /></div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <span style={{
          fontSize: 9.5, letterSpacing: 1.1, textTransform: "uppercase",
          color: C.muted, opacity: .8, marginRight: 2,
        }}>Progress</span>
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
                  if (s.card === null) return <div key={s.id} style={{ width: 74, height: 74 * 1.36 }} />;
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
        <div className="duel-fade" style={{
          background: G.panel, border: `1px solid ${C.gold}66`, borderRadius: 10,
          padding: 14, marginBottom: 12,
          boxShadow: `${SHADOW.panel}, 0 0 24px -12px ${C.gold}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11, flexWrap: "wrap" }}>
            <span style={{
              width: 9, height: 9, borderRadius: 2, flex: "0 0 auto",
              background: `linear-gradient(180deg, ${shade(CARDCOL[selCard.color], 10)}, ${shade(CARDCOL[selCard.color], -12)})`,
              boxShadow: "0 0 0 1px rgba(0,0,0,.4)",
            }} />
            <b style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600, color: C.ink, letterSpacing: .3 }}>
              {selCard.name}
            </b>
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
      cursor: "pointer", padding: "12px 2px", fontSize: 14, fontWeight: 600,
      fontFamily: FONT.display, letterSpacing: .3,
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
        position: "fixed", inset: 0, background: "rgba(6,12,14,.62)", zIndex: 90,
        display: "flex", justifyContent: "flex-end", backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: `linear-gradient(180deg, #1e3036 0%, #16242a 100%)`,
          width: "min(460px, 100%)", height: "100%",
          overflowY: "auto", padding: "0 18px 40px",
          borderLeft: `1px solid ${C.gold}44`,
          boxShadow: "-14px 0 40px rgba(0,0,0,.55)",
        }}
      >
        <div style={{
          position: "sticky", top: 0, background: "#1e3036", paddingTop: 16, paddingBottom: 11,
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderBottom: `1px solid ${C.line}`, zIndex: 2,
        }}>
          <h2 style={{
            margin: 0, fontSize: 19, fontWeight: 600, color: C.ink,
            fontFamily: FONT.display, letterSpacing: .5,
          }}>Rules</h2>
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
/* Hover, focus and keyframes can't be expressed as inline style objects,
   and those are exactly the states that make the board feel like it's made
   of physical pieces. One stylesheet, mounted once by Shell. */
const CSS = `
.duel-card {
  transition: transform .16s cubic-bezier(.2,.8,.3,1), box-shadow .16s, opacity .16s;
  transform: translateZ(0);
}
.duel-card.is-live:hover  { transform: translateY(-5px) scale(1.025); box-shadow: ${SHADOW.cardUp}; z-index: 3; }
.duel-card.is-live:active { transform: translateY(-1px) scale(1.005); }
.duel-card.is-sel         { animation: duel-rise .18s cubic-bezier(.2,.8,.3,1); z-index: 4; }
@keyframes duel-rise { from { transform: translateY(0) } to { transform: translateY(-4px) } }
.duel-card.is-sel { transform: translateY(-4px); }

.duel-chip { transition: filter .14s, transform .14s, box-shadow .14s; }
.duel-chip.is-live:hover  { filter: brightness(1.16); transform: translateY(-1px); }
.duel-chip.is-live:active { transform: translateY(0); }

button { font-family: inherit; }
button:not(:disabled) { transition: filter .14s, transform .1s, box-shadow .14s; }
button:not(:disabled):hover  { filter: brightness(1.1); }
button:not(:disabled):active { transform: translateY(1px); }
button:focus-visible, summary:focus-visible, textarea:focus-visible, input:focus-visible {
  outline: 2px solid ${C.gold}cc; outline-offset: 2px;
}

.duel-pulse { animation: duel-pulse 1.9s ease-in-out infinite; }
@keyframes duel-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }

.duel-pawn { animation: duel-drop .28s cubic-bezier(.2,.9,.3,1); }
@keyframes duel-drop { from { transform: translateY(-7px); opacity: 0 } to { transform: none; opacity: 1 } }

.duel-fade { animation: duel-fade .22s ease-out; }
@keyframes duel-fade { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }

/* The dark surfaces make the default light scrollbars shout. */
* { scrollbar-width: thin; scrollbar-color: ${C.line} transparent; }
*::-webkit-scrollbar { width: 9px; height: 9px; }
*::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 9px; }
*::-webkit-scrollbar-thumb:hover { background: ${C.muted}; }
*::-webkit-scrollbar-track { background: transparent; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  .duel-card.is-live:hover { transform: none; }
}
`;

const BoardStyle = () => <style>{CSS}</style>;


const btn: React.CSSProperties = {
  background: G.gold, color: "#2a2109", border: "1px solid #a87f31", borderRadius: 7,
  padding: "8px 15px", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: .2,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 2px 6px -1px rgba(0,0,0,.5)",
  textShadow: "0 1px 0 rgba(255,255,255,.22)",
};
const btnSm: React.CSSProperties = {
  ...btn, background: G.panel2, color: C.ink, border: `1px solid ${C.line}`,
  padding: "5px 11px", fontSize: 11.5, fontWeight: 600,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 1px 3px rgba(0,0,0,.4)",
  textShadow: "none",
};
const optBtn = (on: boolean): React.CSSProperties => ({
  width: 190, textAlign: "left", padding: 11, borderRadius: 9,
  background: G.panel, border: `1px solid ${C.line}`, color: C.ink,
  boxShadow: SHADOW.panel,
  cursor: on ? "pointer" : "default", opacity: on ? 1 : .5,
});
const th: React.CSSProperties = {
  textAlign: "right", padding: "9px 16px", fontSize: 10.5, color: C.muted, fontWeight: 700,
  letterSpacing: .8, textTransform: "uppercase", borderBottom: `1px solid ${C.line}`,
};
const td: React.CSSProperties = { textAlign: "right", padding: "6px 16px" };

function Shell({ children, status }: { children: React.ReactNode; status?: string }) {
  const [rules, setRules] = useState(false);
  return (
    <div style={{
      background: G.board, backgroundAttachment: "fixed", minHeight: "100vh",
      padding: 14, color: C.ink, fontFamily: FONT.body,
    }}>
      <BoardStyle />
      <div style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 56 }}>
        {status && <div className="duel-fade" style={{
          background: "linear-gradient(180deg, #55411f 0%, #402f16 100%)",
          border: `1px solid ${C.gold}66`, color: "#f4e9cf",
          padding: "8px 12px", borderRadius: 7, fontSize: 12, marginBottom: 10,
          boxShadow: "0 4px 14px -6px rgba(0,0,0,.8)",
        }}>{status}</div>}
        {children}
      </div>

      <button
        onClick={() => setRules(true)}
        aria-label="Open the rules"
        className="duel-chip is-live"
        style={{
          position: "fixed", right: 16, bottom: 16, zIndex: 80,
          background: G.panel2, color: C.ink, border: `1px solid ${C.line}`,
          borderRadius: 999, padding: "9px 18px", fontSize: 12.5, fontWeight: 600,
          cursor: "pointer",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 6px 18px -4px rgba(0,0,0,.7)",
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
            Give your opponent this code. The board opens as soon as they join.
          </p>
          <div style={{
            fontSize: 44, fontWeight: 700, letterSpacing: 10, textIndent: 10, color: C.gold,
            fontFamily: FONT.mono, padding: "22px 0",
            background: G.panel, borderRadius: 12,
            border: `1px solid ${C.gold}44`,
            boxShadow: `${SHADOW.panel}, 0 0 40px -18px ${C.gold}`,
            textShadow: `0 0 26px ${C.gold}66`,
          }}>{link.myCode}</div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 18 }}>Waiting for them to join…</p>
          <button onClick={onCancel} style={{ ...btnSm, marginTop: 20 }}>Cancel</button>
        </div>
      </Shell>
    );
  }

  /* ---- manual: swap descriptors by hand ---- */
  return (
    <Shell status={status}>
      <div style={{ maxWidth: 460, margin: "30px auto" }}>
        <h2 style={{
          fontFamily: FONT.display, fontSize: 22, margin: "0 0 6px", fontWeight: 600, letterSpacing: .4,
        }}>
          {host ? "Send them this" : "Send this back"}
        </h2>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 20px", lineHeight: 1.55 }}>
          {host
            ? "They paste this into Join, send you their reply code, and you paste that below."
            : "Paste this into the message thread. Once the host enters it, the board opens by itself."}
        </p>

        <CodeBox code={link.myCode ?? ""} label={host ? "Your invite code" : "Your reply code"} />

        {host ? (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Their reply code</div>
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
    background: "#1b2c31", border: `1px solid ${C.line}`, color: C.ink,
    borderRadius: 7, padding: "9px 11px", fontSize: 13, width: "100%", boxSizing: "border-box",
    boxShadow: SHADOW.sunk, fontFamily: "inherit",
  };
  const tabBtn = (on: boolean): React.CSSProperties => ({
    ...btnSm, background: on ? G.gold : "transparent",
    color: on ? "#2a2109" : C.muted,
    border: `1px solid ${on ? "#a87f31" : C.line}`,
    borderRadius: 999, padding: "4px 13px",
    boxShadow: on ? "inset 0 1px 0 rgba(255,255,255,.3)" : "none",
  });

  return (
    <Shell status={status}>
      <div style={{ maxWidth: 440, margin: "40px auto" }}>
        <div className="duel-fade" style={{ textAlign: "center", marginBottom: 30 }}>
          <svg viewBox="0 0 64 64" width="54" height="54" style={{ opacity: .9, marginBottom: 6 }}>
            <circle cx="32" cy="32" r="25" fill="none" stroke={C.gold} strokeWidth="1.6" opacity=".55" />
            <circle cx="32" cy="32" r="18" fill="none" stroke={C.gold} strokeWidth="1" opacity=".38" />
            <path d="M32 10 L42 32 L32 54 L22 32 Z" fill={C.gold} opacity=".5" />
            <circle cx="32" cy="32" r="4.4" fill={C.gold} opacity=".92" />
          </svg>
          <h1 style={{
            fontFamily: FONT.display, fontSize: 46, margin: "0 0 8px", fontWeight: 700,
            letterSpacing: 8, textIndent: 8, color: C.ink,
            textShadow: `0 0 44px ${C.gold}44`,
          }}>DUEL</h1>
          <div style={{
            width: 78, height: 1, margin: "0 auto 14px",
            background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
          }} />
          <p style={{ fontSize: 13.5, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Three ages, two cities. Win by military, by science, or on points.
          </p>
        </div>

        <div style={{
          background: G.panel, borderRadius: 12, padding: 18,
          border: `1px solid ${C.line}`, boxShadow: SHADOW.panel, marginBottom: 14,
        }}>
          <div style={{
            fontFamily: FONT.display, fontSize: 14, fontWeight: 600, marginBottom: 12,
            letterSpacing: .6, color: C.ink,
          }}>Same screen</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={a} onChange={(e) => setA(e.target.value)} style={inp} />
            <input value={b} onChange={(e) => setB(e.target.value)} style={inp} />
          </div>
          <button onClick={() => onLocal(a || "Player 1", b || "Player 2")} style={btn}>Start</button>
        </div>

        <div style={{
          background: G.panel, borderRadius: 12, padding: 18,
          border: `1px solid ${C.line}`, boxShadow: SHADOW.panel,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
            <span style={{
              fontFamily: FONT.display, fontSize: 14, fontWeight: 600, letterSpacing: .6, color: C.ink,
            }}>Separate devices</span>
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
            <input value={b} onChange={(e) => setB(e.target.value)} style={inp} placeholder="Opponent's name" />
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
