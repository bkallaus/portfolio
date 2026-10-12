import React, { useState, useEffect, useRef } from "react";
import { C, CARDCOL, FONT, G, RES, RESCOL, RESLET, SCI, SCIINK, SHADOW, pipFill, shade } from "./theme.ts";
import type { CardColor, Resource, ScienceSymbol } from "./theme.ts";
import {
  CARDS, CARD, WONDERS, WON, TOKENS, TOK, LAYOUTS,
  isOpen, view, cardCost, wonderCost,
  newGame, DRAFT, draftPick, clone,
  actBuild, actDiscard, actWonder, resolve,
  milVP, score,
} from "./engine.ts";
import type { Age, Card, Cost, GameState, ScoreBreakdown } from "./engine.ts";
import { ageTint as tintFor, CardArt, Capital, Crest, Icon, Laurel, LobbyScene, PLAYER, Pawn, TokenDisc, WonderArt, describeCard } from "./art.tsx";
import { diffEvents } from "./fx.ts";
import type { Fx } from "./fx.ts";
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
  const { col, label, parts } = SCI[k];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={label}
      style={{ display: "block", filter: `drop-shadow(0 1px 1px rgba(0,0,0,.45))`, flex: "0 0 auto" }}>
      <title>{label}</title>
      {parts.map((part) => (
        <path key={part.d} d={part.d}
          fill={part.w ? "none" : part.ink ? SCIINK : col}
          stroke={part.w ? (part.ink ? SCIINK : col) : "none"}
          strokeWidth={part.w} strokeLinecap="round" strokeLinejoin="round" />
      ))}
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

const VP = ({ n, size = 17 }: { n: number; size?: number }) => (
  <span title={`${n} victory points`} style={{
    width: size, height: size, borderRadius: "50%",
    background: `linear-gradient(180deg, ${shade(CARDCOL.blue, 10)}, ${shade(CARDCOL.blue, -12)})`,
    boxShadow: `0 0 0 1px ${shade(CARDCOL.blue, -26)}, 0 1px 1px rgba(0,0,0,.4)`,
    color: "#fff", textShadow: "0 1px 1px rgba(0,0,0,.4)",
    fontSize: size * 0.64, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center",
    flex: "0 0 auto", outline: `1.5px dotted ${shade(CARDCOL.blue, 30)}`, outlineOffset: -4,
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
const ROMAN = ["", "I", "II", "III"];
const coinsText = (n: number): string => `${n} coin${Math.abs(n) === 1 ? "" : "s"}`;

interface CardFaceProps {
  card: Card;
  w?: number;
  selected?: boolean;
  dim?: boolean;
  onClick?: () => void;
  cost?: { total: number; chained: boolean; affordable: boolean } | null;
  delay?: number;
}

function CardEffects({ card, scale = 1 }: { card: Card; scale?: number }) {
  const s = (n: number) => Math.round(n * scale * 10) / 10;
  return (
    <>
      {card.prod && entries(card.prod).flatMap(([r, n]) =>
        Array.from({ length: n }, (_, k) => <Pip key={r + k} r={r} size={s(14)} />))}
      {card.prodChoice && (
        <span style={{ display: "flex", gap: 1, alignItems: "center" }}>
          {card.prodChoice.map((r, k) => (
            <React.Fragment key={r}>{k > 0 && <span style={{ fontSize: s(8), color: "#6a5c40" }}>/</span>}<Pip r={r} size={s(11)} /></React.Fragment>
          ))}
        </span>
      )}
      {card.sci && <SciMark k={card.sci} size={s(17)} />}
      {card.shields > 0 && <Shield n={card.shields} />}
      {card.vp > 0 && <VP n={card.vp} size={s(17)} />}
      {card.gainCoins && <Coin n={card.gainCoins} size={s(16)} />}
      {card.fixTrade && (
        <span style={{ display: "flex", gap: 1, alignItems: "center" }}>
          {card.fixTrade.map((r) => <Pip key={r} r={r} size={s(10)} />)}
          <span style={{ fontSize: s(8), color: "#6a5c40", margin: "0 1px" }}>=</span>
          <Coin n={1} size={s(11)} />
        </span>
      )}
      {card.coinsPer && (
        <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Coin n={card.coinsPer.n} size={s(13)} />
          <span style={{ fontSize: s(8), color: "#6a5c40" }}>/</span>
          {card.coinsPer.colors.map((c) => <ColorTab key={c} c={c} size={s(9)} />)}
        </span>
      )}
      {card.coinsPerWonder && (
        <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Coin n={card.coinsPerWonder} size={s(13)} />
          <span style={{ fontSize: s(8), color: "#6a5c40" }}>/</span>
          <Icon name="pyramid" size={s(11)} color="#a87f31" />
        </span>
      )}
      {card.guild && (
        <span style={{ display: "flex", gap: 2, alignItems: "center", fontSize: s(8), color: "#4a3d26", fontWeight: 700 }}>
          {card.guild.treasury
            ? <><VP n={1} size={s(14)} />/<Coin n={3} size={s(12)} /></>
            : card.guild.wonders
              ? <><VP n={2} size={s(14)} />/<Icon name="pyramid" size={s(11)} color="#a87f31" /></>
              : <><Coin n={1} size={s(11)} /><VP n={1} size={s(14)} />/{(card.guild.colors ?? []).map((c) => <ColorTab key={c} c={c} size={s(9)} />)}</>}
        </span>
      )}
    </>
  );
}

const ColorTab = ({ c, size = 9 }: { c: CardColor; size?: number }) => (
  <span style={{
    width: size, height: size * 1.3, borderRadius: 2, flex: "0 0 auto", display: "inline-block",
    background: `linear-gradient(180deg, ${shade(CARDCOL[c], 12)}, ${shade(CARDCOL[c], -14)})`,
    boxShadow: "0 0 0 .5px rgba(0,0,0,.5)",
  }} />
);

function CardFace({ card, w = 84, selected, dim, onClick, cost, delay }: CardFaceProps) {
  const col = CARDCOL[card.color];
  const h = Math.round(w * 1.42);
  const head = Math.round(w * 0.24);
  const art = Math.round(w * 0.5);
  const k = w / 84;
  const tip = [card.name, ...describeCard(card), card.chainFrom ? `Free if you own ${CARD[card.chainFrom].name}` : ""].filter(Boolean).join("\n");
  return (
    <button
      onClick={onClick}
      title={tip}
      aria-label={card.name}
      className={`duel-card duel-flip${onClick ? " is-live" : ""}${selected ? " is-sel" : ""}${cost && !cost.affordable ? " is-poor" : ""}`}
      style={{
        width: w, height: h, borderRadius: 8 * k, padding: 0, cursor: onClick ? "pointer" : "default",
        border: `1px solid ${selected ? C.gold : "rgba(0,0,0,.55)"}`,
        boxShadow: selected
          ? `0 0 0 3px ${C.gold}88, 0 0 26px 2px ${C.gold}66, ${SHADOW.cardUp}`
          : SHADOW.card,
        opacity: dim ? 0.6 : 1, filter: dim ? "saturate(.5) brightness(.6)" : "none",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", textAlign: "left",
        background: `linear-gradient(180deg, ${col}26 0%, ${col}00 40%), ${G.card}`,
        animationDelay: delay ? `${delay}ms` : undefined,
      }}
    >
      <div style={{
        background: `linear-gradient(180deg, ${shade(col, 14)} 0%, ${col} 58%, ${shade(col, -16)} 100%)`,
        padding: `0 ${4 * k}px`, height: head, boxSizing: "border-box", flex: "0 0 auto",
        display: "flex", alignItems: "center", gap: 3 * k,
        borderBottom: "1px solid rgba(0,0,0,.35)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.28)",
      }}>
        <div style={{
          flex: 1, minWidth: 0,
          fontSize: 8.6 * k, fontWeight: 700, color: "#fff", lineHeight: 1.08, letterSpacing: .2,
          fontFamily: FONT.display, textShadow: "0 1px 1px rgba(0,0,0,.55)",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {card.name}
        </div>
        <span style={{
          fontSize: 6.6 * k, fontWeight: 800, color: "rgba(255,255,255,.75)", fontFamily: FONT.display,
          letterSpacing: .4, flex: "0 0 auto",
        }}>{card.age ? ROMAN[card.age] : "G"}</span>
      </div>
      <div style={{
        height: art, flex: "0 0 auto", position: "relative", overflow: "hidden",
        margin: `${2 * k}px ${3 * k}px 0`, borderRadius: 4 * k,
        boxShadow: `inset 0 0 0 1px ${shade(col, -30)}55, 0 1px 0 rgba(255,255,255,.6)`,
      }}>
        <CardArt card={card} w={w - 6 * k} h={art} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 4 * k, boxShadow: `inset 0 0 0 1px ${C.gold}55` }} />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 * k, flexWrap: "wrap", padding: `${1 * k}px ${2 * k}px` }}>
        <CardEffects card={card} scale={k} />
      </div>
      <div style={{
        padding: `${2 * k}px ${4 * k}px`, minHeight: 17 * k, display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(120,104,66,.3)", background: "rgba(120,104,66,.12)",
      }}>
        <CostRow cost={card.cost} size={10 * k} />
        {card.chainFrom && (
          <span title={`Free if you own ${CARD[card.chainFrom].name}`}
            style={{ display: "flex", alignItems: "center", gap: 2, flex: "0 0 auto" }}>
            <Icon name="chain" size={11 * k} color="#4f7f40" />
          </span>
        )}
      </div>
      {cost && (
        <div className="duel-price" style={{
          position: "absolute", top: head + 3 * k, right: 4 * k,
          minWidth: 20 * k, height: 20 * k, borderRadius: 20 * k, padding: `0 ${4 * k}px`, boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
          background: cost.chained
            ? "radial-gradient(circle at 35% 28%, #8fd0a0, #4d8c5c 60%, #2f5f3c)"
            : cost.affordable
              ? "radial-gradient(circle at 34% 26%, #f6dc9c 0%, #dcb15c 45%, #b98c39 100%)"
              : `radial-gradient(circle at 34% 26%, #e8867f, ${C.blood} 60%, #6e221d)`,
          border: `1.5px solid ${cost.chained ? "#2f5f3c" : cost.affordable ? "#8f6a26" : "#5a1914"}`,
          color: cost.chained || !cost.affordable ? "#fff" : "#2a2109",
          textShadow: cost.chained || !cost.affordable ? "0 1px 1px rgba(0,0,0,.5)" : "0 1px 0 rgba(255,255,255,.3)",
          fontSize: 10.5 * k, fontWeight: 800,
          boxShadow: "0 2px 4px rgba(0,0,0,.5)",
        }}>
          {cost.chained ? <Icon name="chain" size={12 * k} color="#fff" /> : !cost.affordable ? <><Icon name="lock" size={9 * k} color="#fff" />{cost.total}</> : cost.total}
        </div>
      )}
    </button>
  );
}

const CardBack = ({ w = 84, age = 1, delay }: { w?: number; age?: number; delay?: number }) => {
  const t = tintFor(age);
  const h = Math.round(w * 1.42);
  return (
    <div className="duel-back" style={{
      width: w, height: h, borderRadius: 8, position: "relative", overflow: "hidden", flex: "0 0 auto",
      background: `radial-gradient(120% 80% at 50% 30%, ${shade(t.a, 8)} 0%, ${t.a} 40%, ${t.b} 100%)`,
      border: "1px solid rgba(0,0,0,.55)", boxShadow: SHADOW.card,
      animationDelay: delay ? `${delay}ms` : undefined,
    }}>
      <div style={{
        position: "absolute", inset: 4, borderRadius: 5,
        border: `1px solid ${t.rim}55`,
        background: `repeating-linear-gradient(45deg, transparent 0 5px, rgba(255,255,255,.035) 5px 10px), repeating-linear-gradient(-45deg, transparent 0 5px, rgba(0,0,0,.06) 5px 10px)`,
      }} />
      <div style={{ position: "absolute", inset: 7, borderRadius: 3, border: `1px dashed ${t.rim}30` }} />
      <svg viewBox="0 0 40 40" width="62%" style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: .7,
      }}>
        <circle cx="20" cy="20" r="16" fill="rgba(0,0,0,.18)" stroke={t.rim} strokeWidth="1.1" />
        <circle cx="20" cy="20" r="12" fill="none" stroke={t.rim} strokeWidth=".6" opacity=".7" strokeDasharray="1.4 1.4" />
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2;
          return <circle key={k} cx={20 + Math.cos(a) * 14} cy={20 + Math.sin(a) * 14} r=".7" fill={t.rim} />;
        })}
        <text x="20" y="24.6" textAnchor="middle" fontSize={t.label.length > 2 ? 11 : 13} fontWeight="700"
          fontFamily="Cinzel, Georgia, serif" fill={t.rim}>{t.label}</text>
      </svg>
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, height: "45%",
        background: "linear-gradient(180deg, rgba(255,255,255,.1), transparent)",
      }} />
    </div>
  );
};

/* ============================================================
   BOARD PIECES
   ============================================================ */
function LootPile({ n, seat }: { n: number; seat: number }) {
  return (
    <span title={`Crossing here costs ${seat === 0 ? "the left" : "the right"} city ${n} coins`} style={{
      position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
    }}>
      <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.6))" }}>
        {Array.from({ length: n === 5 ? 3 : 2 }, (_, k) => (
          <g key={k}>
            <ellipse cx="10" cy={11 - k * 2.6} rx="7" ry="2.6" fill="#8f6a26" />
            <ellipse cx="10" cy={10.2 - k * 2.6} rx="7" ry="2.4" fill="#e6bc63" />
          </g>
        ))}
      </svg>
      <b style={{ fontSize: 8.5, color: "#ffe2b0", lineHeight: 1, textShadow: "0 1px 1px #000" }}>−{n}</b>
    </span>
  );
}

function MilitaryTrack({ st }: { st: GameState }) {
  const cells: React.ReactElement[] = [];
  for (let v = -9; v <= 9; v++) {
    const abs = Math.abs(v);
    const side = v < 0 ? 0 : 1;
    const tint = v === 0 ? null : PLAYER[side];
    const depth = abs === 9 ? 0 : abs <= 2 ? .12 : abs <= 5 ? .22 : .36;
    const lootHere =
      (v === 3 && st.loot.p1_2) || (v === 6 && st.loot.p1_5) ||
      (v === -3 && st.loot.p0_2) || (v === -6 && st.loot.p0_5);
    const zoneEdge = abs === 3 || abs === 6;
    cells.push(
      <div key={v} style={{
        flex: abs === 9 ? 1.6 : 1, minWidth: 0, height: 40, position: "relative",
        background: abs === 9
          ? "transparent"
          : v === 0
            ? "radial-gradient(circle at 50% 50%, #3d5a61 0%, #2a4249 70%)"
            : `linear-gradient(180deg, rgba(184,69,60,${depth + .06}), rgba(110,34,29,${depth}))`,
        borderLeft: zoneEdge && v > 0 ? "2px solid rgba(224,180,94,.35)" : undefined,
        borderRight: (zoneEdge && v < 0) ? "2px solid rgba(224,180,94,.35)" : v < 8 && v !== -9 ? "1px solid rgba(0,0,0,.28)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: tint && abs < 9 ? `inset 0 -3px 0 ${tint.main}${abs <= 2 ? "33" : abs <= 5 ? "55" : "88"}` : undefined,
      }}>
        {abs === 9 && <Capital seat={side} size={30} />}
        {v === 0 && (
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style={{ opacity: .55 }}>
            <path d="M4 4l12 12M16 4L4 16" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
        {lootHere && <LootPile n={abs === 3 ? 2 : 5} seat={side} />}
      </div>
    );
  }
  const lead = st.conflict === 0 ? null : st.conflict > 0 ? 0 : 1;
  const unit = 100 / (17 + 1.6 * 2);
  const centre = (v: number) => {
    const abs = Math.abs(v);
    if (abs === 9) return v < 0 ? unit * 0.8 : 100 - unit * 0.8;
    return unit * 1.6 + (v + 8 + 0.5) * unit;
  };
  const zones = [
    { from: -8, to: -6, vp: 10 }, { from: -5, to: -3, vp: 5 }, { from: -2, to: -1, vp: 2 },
    { from: 1, to: 2, vp: 2 }, { from: 3, to: 5, vp: 5 }, { from: 6, to: 8, vp: 10 },
  ];
  return (
    <div>
      <div style={{
        position: "relative", borderRadius: 10, padding: 3,
        background: "linear-gradient(180deg, #4a3a22, #2c2214)",
        border: "1px solid rgba(0,0,0,.6)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.12), 0 6px 18px -8px rgba(0,0,0,.8)`,
      }}>
        <div style={{
          display: "flex", borderRadius: 7, overflow: "hidden", position: "relative",
          background: "linear-gradient(180deg, #1f3036, #172429)",
          boxShadow: SHADOW.sunk,
        }}>{cells}</div>
        <div className="duel-pawn" style={{
          position: "absolute", top: "50%", left: `calc(3px + (100% - 6px) * ${centre(st.conflict) / 100})`,
          transform: "translate(-50%, -58%)", transition: "left .7s cubic-bezier(.3,1.4,.5,1)", zIndex: 2,
        }}>
          <Pawn size={22} />
        </div>
      </div>
      <div style={{ position: "relative", height: 16, marginTop: 3 }}>
        {zones.map((z) => {
          const owner = z.from < 0 ? 1 : 0;
          const left = (centre(z.from) + centre(z.to)) / 2;
          const at = st.conflict;
          const on = lead === owner && at >= Math.min(z.from, z.to) && at <= Math.max(z.from, z.to);
          return (
            <span key={z.from} title={`${st.names[owner]} scores ${z.vp} VP with the pawn here`} style={{
              position: "absolute", left: `${left}%`, transform: "translateX(-50%)",
              fontSize: 9.5, fontWeight: 700, letterSpacing: .3,
              color: on ? C.gold : "rgba(142,166,171,.7)",
              textShadow: on ? `0 0 8px ${C.gold}` : "none",
              display: "flex", alignItems: "center", gap: 2,
            }}>
              <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0l1.4 3.2L10 3.6 7.3 6l.8 3.6L5 7.8 1.9 9.6 2.7 6 0 3.6l3.6-.4z" fill="currentColor" /></svg>
              {z.vp}
            </span>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: C.muted, marginTop: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: PLAYER[0].light, fontWeight: 600 }}>
          <Crest seat={0} size={13} />{st.names[0]}
        </span>
        <span style={{
          color: lead === null ? C.muted : C.gold, fontWeight: lead === null ? 500 : 700,
          display: "flex", alignItems: "center", gap: 5, fontSize: 11.5,
        }}>
          <Icon name="sword" size={13} color={lead === null ? C.muted : C.gold} />
          {lead === null ? "Armies stand even" : `${st.names[lead]} leads · +${milVP(Math.abs(st.conflict))} VP`}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, color: PLAYER[1].light, fontWeight: 600 }}>
          {st.names[1]}<Crest seat={1} size={13} />
        </span>
      </div>
    </div>
  );
}

function TokenChip({ id, onClick, small }: { id: string; onClick?: () => void; small?: boolean }) {
  const t = TOK[id];
  return (
    <button onClick={onClick} title={`${t.name}: ${t.text}`} className={onClick ? "duel-chip is-live" : "duel-chip"} style={{
      background: "linear-gradient(180deg, #477056 0%, #375c46 100%)",
      border: `1px solid #5c8a6d`, color: "#e6f2e8",
      borderRadius: 999, padding: small ? "1px 9px 1px 1px" : "2px 12px 2px 2px", fontSize: small ? 9.5 : 11,
      fontWeight: 600, letterSpacing: .2,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.13), 0 1px 3px rgba(0,0,0,.4)",
      cursor: onClick ? "pointer" : "default", display: "flex", alignItems: "center", gap: 5,
    }}>
      <TokenDisc id={id} size={small ? 18 : 24} />
      {t.name}
    </button>
  );
}

function TokenMedal({ id }: { id: string }) {
  const t = TOK[id];
  return (
    <div title={`${t.name}: ${t.text}`} className="duel-medal" style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 62,
    }}>
      <TokenDisc id={id} size={38} />
      <span style={{ fontSize: 9.5, color: "#bfe0c8", fontWeight: 600, letterSpacing: .2, textAlign: "center", lineHeight: 1.1 }}>{t.name}</span>
    </div>
  );
}

interface FloatItem { key: string; text: string; color: string }

function fxToFloats(fx: Fx[], seat: number): FloatItem[] {
  return fx.flatMap((f, k): FloatItem[] => {
    if (f.player !== seat) return [];
    const key = `${f.kind}${k}`;
    if (f.kind === "coins") return [{ key, text: `${f.n > 0 ? "+" : ""}${coinsText(f.n)}`, color: f.n > 0 ? "#f2cd7c" : "#e8867f" }];
    if (f.kind === "shields") return [{ key, text: `+${f.n} shield${f.n > 1 ? "s" : ""}`, color: "#ff9c8f" }];
    if (f.kind === "card") return [{ key, text: CARD[f.id].name, color: shade(CARDCOL[CARD[f.id].color], 30) }];
    if (f.kind === "destroyed") return [{ key, text: `${CARD[f.id].name} destroyed`, color: "#e8867f" }];
    if (f.kind === "wonder") return [{ key, text: `${WON[f.id].name} rises!`, color: "#ffe08a" }];
    if (f.kind === "token") return [{ key, text: TOK[f.id].name, color: "#9fe0b4" }];
    return [];
  });
}

const SCI_ORDER: ScienceSymbol[] = ["wheel", "tablet", "mortar", "plumb", "sundial", "astrolabe", "law"];

function WonderTile({ id, built, w }: { id: string; built: boolean; w?: number }) {
  const wd = WON[id];
  return (
    <div title={`${wd.name}: ${wd.text}`} className={built ? "duel-wonder is-built" : "duel-wonder"} style={{
      width: w ?? "100%", borderRadius: 7, overflow: "hidden", position: "relative", flex: "0 0 auto",
      border: `1px solid ${built ? C.gold : "rgba(0,0,0,.5)"}`,
      boxShadow: built ? `0 0 0 1px ${C.gold}44, 0 0 16px -4px ${C.gold}aa` : SHADOW.card,
      background: "#1a272b",
    }}>
      <div style={{ aspectRatio: "120 / 64" }}><WonderArt id={id} w="100%" h="100%" dim={!built} /></div>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 5px 3px",
        background: "linear-gradient(180deg, transparent, rgba(10,14,16,.86))",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 4,
      }}>
        <span style={{
          fontSize: 8.6, fontWeight: 700, fontFamily: FONT.display, letterSpacing: .2, lineHeight: 1.1,
          color: built ? "#ffe9b8" : "#c9d3d5", textShadow: "0 1px 2px #000",
        }}>{wd.name.replace(/^The /, "")}</span>
        {built
          ? <Laurel n={wd.vp} size={20} />
          : <span style={{ opacity: .95 }}><CostRow cost={wd.cost} size={8} /></span>}
      </div>
    </div>
  );
}

function City({ st, i, me, floats }: { st: GameState; i: number; me?: boolean; floats?: FloatItem[] }) {
  const v = view(st, i);
  const groups: CardColor[] = ["brown", "grey", "yellow", "red", "blue", "green", "purple"];
  const sc = score(st, i);
  const active = st.turn === i && st.phase === "play";
  const pc = PLAYER[i];
  const distinct = Object.keys(v.sci).length;
  return (
    <div className={active ? "duel-city is-active" : "duel-city"} style={{
      position: "relative",
      background: `linear-gradient(180deg, ${pc.dark}38 0%, rgba(0,0,0,0) 90px), ${G.panel}`,
      borderRadius: 12, padding: 12,
      borderStyle: "solid", borderWidth: "3px 1px 1px",
      borderColor: `${pc.main} ${active ? `${C.gold}77` : C.line} ${active ? `${C.gold}77` : C.line}`,
      boxShadow: active ? `${SHADOW.panel}, 0 0 0 1px ${C.gold}33, 0 0 30px -10px ${C.gold}88` : SHADOW.panel,
      transition: "border-color .3s, box-shadow .3s",
    }}>
      <div style={{ position: "absolute", top: -6, right: 12, left: 12, pointerEvents: "none", zIndex: 5 }}>
        {(floats ?? []).map((f, k) => (
          <div key={f.key} className="duel-float" style={{
            position: "absolute", right: 0, top: -14 - k * 26, whiteSpace: "nowrap",
            fontSize: 12.5, fontWeight: 800, color: f.color, fontFamily: FONT.display, letterSpacing: .4,
            textShadow: "0 1px 2px rgba(0,0,0,.9)",
            background: "rgba(10,16,18,.88)", border: `1px solid ${f.color}88`, borderRadius: 999, padding: "3px 11px",
            boxShadow: `0 6px 18px -6px rgba(0,0,0,.9), 0 0 14px -4px ${f.color}`,
            animationDelay: `${k * 140}ms`,
          }}>{f.text}</div>
        ))}
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, paddingBottom: 9, borderBottom: `1px solid ${C.line}88`, gap: 8,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <Crest seat={i} size={26} />
          <span style={{ minWidth: 0 }}>
            <span style={{
              fontFamily: FONT.display, fontWeight: 700, fontSize: 16, letterSpacing: .4,
              color: active ? C.gold : C.ink, display: "flex", alignItems: "center", gap: 7,
            }}>
              {st.names[i]}
              {me && <span style={{ fontSize: 9, fontFamily: FONT.body, color: pc.light, border: `1px solid ${pc.main}88`, borderRadius: 999, padding: "1px 6px", letterSpacing: .5 }}>YOU</span>}
            </span>
            <span style={{ fontSize: 10, color: active ? C.gold : C.muted, letterSpacing: .6, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
              {active && <span className="duel-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, boxShadow: `0 0 8px ${C.gold}` }} />}
              {active ? "Taking a turn" : `${v.p.built.length} buildings`}
            </span>
          </span>
        </span>
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span title={coinsText(v.p.coins)} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CoinStack n={v.p.coins} />
          </span>
          <span title={`${v.shields} shields`} style={{ display: "flex", alignItems: "center", gap: 3, opacity: v.shields ? 1 : .45 }}>
            <Shield n={1} /><b style={{ fontSize: 13, color: "#ff9c8f" }}>{v.shields}</b>
          </span>
          <span title={`${sc.total} victory points so far`}><Laurel n={sc.total} size={34} /></span>
        </span>
      </div>

      <SectionLabel>Storehouse</SectionLabel>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 9, alignItems: "center" }}>
        {RES.map((r) => {
          const n = v.prod[r] || 0;
          return (
            <span key={r} title={`${n} ${r}`} style={{
              display: "flex", alignItems: "center", gap: 3, opacity: n ? 1 : .32,
              background: n ? "rgba(0,0,0,.22)" : "transparent", borderRadius: 999, padding: "2px 7px 2px 2px",
              border: `1px solid ${n ? `${RESCOL[r]}66` : "rgba(255,255,255,.06)"}`,
            }}>
              <Pip r={r} size={17} />
              <b style={{ fontSize: 12, color: C.ink, minWidth: 6 }}>{n}</b>
            </span>
          );
        })}
        {v.choices.map((ch, k) => (
          <span key={k} title={`One of ${ch.join(" / ")} each turn`} style={{
            display: "flex", alignItems: "center", gap: 1, borderRadius: 999, padding: "2px 6px",
            background: "rgba(224,180,94,.1)", border: `1px dashed ${C.gold}66`,
          }}>
            {ch.map((r, m) => <React.Fragment key={r}>{m > 0 && <span style={{ fontSize: 8, color: C.muted }}>/</span>}<Pip r={r} size={13} /></React.Fragment>)}
          </span>
        ))}
      </div>

      <SectionLabel right={<span style={{ color: distinct >= 5 ? C.gold : C.muted }}>{distinct}/6 for supremacy</span>}>Science</SectionLabel>
      <div style={{ display: "flex", gap: 5, marginBottom: 10, alignItems: "center" }}>
        {SCI_ORDER.filter((k) => k !== "law" || v.sci.law).map((k) => {
          const n = v.sci[k] || 0;
          return (
            <span key={k} title={`${SCI[k].label}${n ? ` ×${n}` : " (missing)"}`} style={{
              width: 26, height: 26, borderRadius: "50%", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: n ? "radial-gradient(circle at 40% 30%, #fffaf0, #e9dfc4)" : "rgba(0,0,0,.25)",
              border: `1.5px ${n ? "solid" : "dashed"} ${n ? SCI[k].col : "rgba(255,255,255,.14)"}`,
              boxShadow: n ? `0 0 10px -2px ${SCI[k].col}` : "none",
              opacity: n ? 1 : .55,
            }}>
              <span style={{ opacity: n ? 1 : .35, filter: n ? "none" : "grayscale(1)" }}><SciMark k={k} size={16} /></span>
              {n > 1 && <b style={{
                position: "absolute", right: -5, bottom: -4, fontSize: 9, color: "#2a2109",
                background: G.gold, borderRadius: 999, padding: "0 3px", boxShadow: "0 1px 2px rgba(0,0,0,.6)",
              }}>×{n}</b>}
            </span>
          );
        })}
      </div>

      {v.p.wonders.length > 0 && (
        <>
          <SectionLabel right={<span>{v.p.wonders.filter((w) => w.built).length}/{v.p.wonders.length} raised</span>}>Wonders</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 6, marginBottom: 10 }}>
            {v.p.wonders.map((w) => <WonderTile key={w.id} id={w.id} built={w.built} />)}
          </div>
        </>
      )}

      {v.p.tokens.length > 0 && (
        <>
          <SectionLabel>Progress</SectionLabel>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {v.p.tokens.map((t) => <TokenChip key={t} id={t} small />)}
          </div>
        </>
      )}

      <SectionLabel>City</SectionLabel>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start", minHeight: 30 }}>
        {groups.map((g) => {
          const list = v.p.built.filter((id) => CARD[id].color === g);
          if (!list.length) return null;
          return (
            <div key={g} style={{ display: "flex", flexDirection: "column", width: 92 }}>
              {list.map((id, k) => (
                <div key={id} title={[CARD[id].name, ...describeCard(CARD[id])].join("\n")} className="duel-mini" style={{
                  height: 19, marginTop: k ? -2 : 0, borderRadius: 4, padding: "0 5px",
                  display: "flex", alignItems: "center", gap: 4,
                  background: `linear-gradient(180deg, ${shade(CARDCOL[g], 10)}, ${shade(CARDCOL[g], -14)})`,
                  border: "1px solid rgba(0,0,0,.45)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 1px 2px rgba(0,0,0,.4)",
                  position: "relative", zIndex: k,
                }}>
                  <span style={{
                    flex: 1, minWidth: 0, fontSize: 8.6, fontWeight: 700, color: "#fff",
                    textShadow: "0 1px 1px rgba(0,0,0,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{CARD[id].name}</span>
                  <MiniEffect card={CARD[id]} />
                </div>
              ))}
            </div>
          );
        })}
        {!v.p.built.length && <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>An empty plain, waiting for its first building.</span>}
      </div>
    </div>
  );
}

function MiniEffect({ card }: { card: Card }) {
  if (card.prod) {
    const [r] = entries(card.prod)[0]!;
    return <Pip r={r} size={10} />;
  }
  if (card.sci) return <SciMark k={card.sci} size={11} />;
  if (card.shields) return <span style={{ display: "flex", alignItems: "center", gap: 1 }}><b style={{ fontSize: 8.6, color: "#ffe2dc" }}>{card.shields}</b><Icon name="shield" size={10} color="#ffe2dc" /></span>;
  if (card.vp) return <VP n={card.vp} size={13} />;
  return null;
}

function CoinStack({ n }: { n: number }) {
  const layers = Math.min(3, Math.floor(n / 5));
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.6))" }}>
        {Array.from({ length: layers }, (_, k) => (
          <g key={k}>
            <ellipse cx="12" cy={20 - k * 2.6} rx="8" ry="2.4" fill="#8f6a26" />
            <ellipse cx="12" cy={19.2 - k * 2.6} rx="8" ry="2.2" fill="#dcb15c" />
          </g>
        ))}
        <circle cx="9" cy={11 - layers * 1.4} r="7.4" fill="#b98c39" />
        <circle cx="9" cy={10.4 - layers * 1.4} r="7" fill="#e6bc63" stroke="#8f6a26" strokeWidth=".8" />
        <circle cx="9" cy={10.4 - layers * 1.4} r="4.6" fill="none" stroke="#b98c39" strokeWidth=".8" />
        <path d={`M6.6 ${8 - layers * 1.4}a3 3 0 0 1 3-1.6`} stroke="#fff4c8" strokeWidth="1" fill="none" strokeLinecap="round" />
      </svg>
      <b style={{ fontSize: 14, color: "#f2cd7c", fontWeight: 800, textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>{n}</b>
    </span>
  );
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      fontSize: 9, letterSpacing: 1.3, textTransform: "uppercase", color: C.muted, marginBottom: 5, opacity: .9,
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 10, height: 1, background: `${C.gold}88` }} />{children}
      </span>
      {right && <span style={{ letterSpacing: .3, textTransform: "none", fontSize: 10 }}>{right}</span>}
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

  const [fx, setFx] = useState<{ n: number; items: Fx[] }>({ n: 0, items: [] });
  const prevSt = useRef<GameState | null>(null);
  const rewinding = useRef(false);
  useEffect(() => {
    const prev = prevSt.current;
    prevSt.current = st;
    if (rewinding.current) { rewinding.current = false; return; }
    if (!prev || !st) return;
    const items = diffEvents(prev, st);
    if (items.length) setFx((f) => ({ n: f.n + 1, items }));
  }, [st]);
  useEffect(() => {
    if (!fx.n) return;
    const t = setTimeout(() => setFx((f) => ({ ...f, items: [] })), 2600);
    return () => clearTimeout(t);
  }, [fx.n]);

  const push = (next: GameState) => {
    if (mode !== "direct") return;
    if (!linked()) { setStatus("Connection dropped. Re-link to carry on."); return; }
    try { chan.current?.send({ t: "state", st: next }); }
    catch (_e) { setStatus("Couldn't send that move — the connection may have dropped."); }
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
    if (peer.current) { try { peer.current.close(); } catch (_e) {} peer.current = null; }
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
    rewinding.current = true;
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
          catch (_e) { setStatus("That reply code didn't parse. Copy the whole thing and try again."); }
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
      } catch (_e) { abort("Couldn't reach the broker. Try swapping codes manually instead."); }
    };

    const startQuickJoin = async (code: string) => {
      setMode("direct"); setSeat(1);
      setLink({ how: "quick", role: "guest", step: "working" });
      try { peer.current = await quickJoin(code, handlers); }
      catch (_e) { abort("Couldn't reach the broker. Try swapping codes manually instead."); }
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
      } catch (_e) { abort("Couldn't start a direct connection here."); }
    };

    const startManualJoin = async (offer: string) => {
      if (!window.RTCPeerConnection) { setStatus("This browser can't open a direct connection."); return; }
      setMode("direct"); setSeat(1);
      setLink({ how: "manual", role: "guest", step: "working" });
      try {
        const { pc, code } = await manualJoin(offer, handlers);
        peer.current = pc;
        setLink({ how: "manual", role: "guest", step: "share", myCode: code });
      } catch (_e) { abort("That invite code didn't parse. Copy the whole thing and try again."); }
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
  const ageFx = fx.items.find((f): f is Extract<Fx, { kind: "age" }> => f.kind === "age");

  if (st.phase === "draft") {
    const picker = (DRAFT[st.draftStep] + st.first) % 2;
    const yours = mode === "local" || picker === seat;
    return (
      <Shell status={status}>
        <div className="duel-fade" style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 3, color: C.gold, textTransform: "uppercase", marginBottom: 4 }}>Before Age I</div>
          <h2 style={{
            margin: "0 0 6px", fontSize: 30, color: C.ink, fontWeight: 700,
            fontFamily: FONT.display, letterSpacing: 1.5, textShadow: `0 0 30px ${C.gold}44`,
          }}>Claim your Wonders</h2>
          <p style={{ margin: "0 auto 12px", fontSize: 13, color: C.muted, maxWidth: 520, lineHeight: 1.5 }}>
            One each, then two, then the last — and the order flips for the second set of four.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 999,
            background: `${PLAYER[picker].dark}66`, border: `1px solid ${PLAYER[picker].main}88` }}>
            <Crest seat={picker} size={18} />
            <b style={{ fontFamily: FONT.display, fontSize: 14, color: PLAYER[picker].light, letterSpacing: .4 }}>{st.names[picker]} picks</b>
            <span style={{ display: "flex", gap: 4, marginLeft: 6 }}>
              {DRAFT.map((d, k) => {
                const who = (d + st.first) % 2;
                const done = k < st.draftStep, now = k === st.draftStep;
                return (
                  <span key={k} title={`Pick ${k + 1}: ${st.names[who]}`} className={now ? "duel-pulse" : undefined} style={{
                    width: now ? 12 : 9, height: now ? 12 : 9, borderRadius: "50%",
                    background: done ? PLAYER[who].main : now ? PLAYER[who].light : "transparent",
                    border: `1.5px solid ${PLAYER[who].main}`, marginLeft: k === 4 ? 6 : 0,
                    opacity: done ? .55 : 1,
                  }} />
                );
              })}
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {st.draftPool.map((id, k) => {
            const w = WON[id];
            return (
              <button key={id} type="button" data-draft disabled={!yours} onClick={() => { const n = draftPick(clone(st), id); commit(n); }}
                className={yours ? "duel-card duel-deal is-live" : "duel-card duel-deal"}
                style={{
                  textAlign: "left", padding: 0, borderRadius: 12, overflow: "hidden",
                  background: G.panel, color: C.ink,
                  border: `1px solid ${C.gold}55`,
                  boxShadow: `${SHADOW.panel}, 0 0 0 1px rgba(0,0,0,.4)`,
                  cursor: yours ? "pointer" : "default", opacity: yours ? 1 : .5,
                  display: "flex", flexDirection: "column", alignItems: "stretch",
                  animationDelay: `${k * 90}ms`,
                }}>
                <div style={{ position: "relative", aspectRatio: "120 / 64" }}>
                  <WonderArt id={id} w="100%" h="100%" />
                  {w.vp > 0 && <span style={{ position: "absolute", top: 6, right: 6 }}><Laurel n={w.vp} size={34} /></span>}
                </div>
                <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, letterSpacing: .3, lineHeight: 1.2 }}>{w.name}</div>
                  <WonderPerks id={id} />
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.45, flex: 1 }}>{w.text}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 8, borderTop: `1px solid ${C.line}88` }}>
                    <span style={{ fontSize: 9, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Cost</span>
                    <CostRow cost={w.cost} size={14} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 18 }}>
          {[0, 1].map((j) => (
            <div key={j} style={{
              background: `linear-gradient(180deg, ${PLAYER[j].dark}40, transparent 70px), ${G.panel}`, borderRadius: 12, padding: 12,
              border: `1px solid ${C.line}`, borderTop: `3px solid ${PLAYER[j].main}`, boxShadow: SHADOW.panel,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Crest seat={j} size={20} />
                <b style={{ fontFamily: FONT.display, fontSize: 14, color: C.ink, letterSpacing: .3 }}>{st.names[j]}</b>
                <span style={{ fontSize: 10.5, color: C.muted, marginLeft: "auto" }}>{st.players[j].wonders.length}/4</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {Array.from({ length: 4 }, (_, k) => {
                  const w = st.players[j].wonders[k];
                  return w
                    ? <div key={w.id} className="duel-deal"><WonderTile id={w.id} built /></div>
                    : <div key={`empty${k}`} style={{ aspectRatio: "120 / 64", borderRadius: 7, border: `1px dashed ${C.line}`, background: "rgba(0,0,0,.15)" }} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  if (st.phase === "over") {
    const a = score(st, 0), b = score(st, 1);
    const w = st.winner!;
    const rows: (keyof ScoreBreakdown)[] = ["military", "blue", "green", "yellow", "guild", "wonders", "tokens", "coins"];
    const label: Record<string, string> = { military: "Military", blue: "Civilian", green: "Science", yellow: "Commercial", guild: "Guilds", wonders: "Wonders", tokens: "Progress", coins: "Treasury" };
    const tint: Record<string, string> = { military: CARDCOL.red, blue: CARDCOL.blue, green: CARDCOL.green, yellow: CARDCOL.yellow, guild: CARDCOL.purple, wonders: C.gold, tokens: "#5c8a6d", coins: "#c9a24a" };
    const top = Math.max(1, ...rows.map((r) => Math.max(a[r], b[r])));
    const champ = w.p ?? 0;
    return (
      <Shell status={status}>
        <Confetti colors={w.p === null ? [PLAYER[0].main, PLAYER[1].main, C.gold] : [PLAYER[champ].main, PLAYER[champ].light, C.gold, "#fff4c8"]} />
        <div className="duel-fade" style={{ textAlign: "center", padding: "10px 0 18px" }}>
          <div className="duel-crown" style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 14, marginBottom: 8 }}>
            {w.p === null
              ? <><Crest seat={0} size={52} /><Crest seat={1} size={52} /></>
              : <span style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "50%", top: -26, transform: "translateX(-50%)" }}><Icon name="crown" size={34} color={C.gold} /></span>
                  <Crest seat={champ} size={68} />
                </span>}
          </div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: C.gold, textTransform: "uppercase" }}>
            {w.by === "military" ? "Military supremacy" : w.by === "science" ? "Scientific supremacy" : w.by === "tiebreak" ? "Victory on civilian buildings" : w.by === "draw" ? "Honours even" : "Victory on points"}
          </div>
          <h2 style={{
            margin: "4px 0 6px", fontSize: 44, color: C.gold, fontWeight: 700,
            fontFamily: FONT.display, letterSpacing: 1.5,
            textShadow: `0 0 40px ${C.gold}77, 0 2px 0 #6e5320`,
          }}>
            {w.p === null ? "A shared victory" : `${st.names[w.p]} triumphs`}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {w.by === "military" ? "The pawn reached the enemy capital." : w.by === "science" ? "Six different scientific symbols — the age belongs to the scholars." :
              w.by === "tiebreak" ? "Level on points, decided on civilian buildings." : `${a.total} to ${b.total} after three ages.`}
          </p>
        </div>
        <div style={{
          maxWidth: 620, margin: "0 auto", background: G.panel, border: `1px solid ${C.gold}55`, borderRadius: 14,
          boxShadow: `${SHADOW.panel}, 0 0 50px -24px ${C.gold}`, padding: "14px 16px",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {[0, 1].map((j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: j ? "flex-start" : "flex-end", order: j ? 3 : 1 }}>
                {j === 0 && <b style={{ fontFamily: FONT.display, fontSize: 15, color: PLAYER[0].light }}>{st.names[0]}</b>}
                <Crest seat={j} size={22} />
                {j === 1 && <b style={{ fontFamily: FONT.display, fontSize: 15, color: PLAYER[1].light }}>{st.names[1]}</b>}
              </div>
            ))}
            <span style={{ order: 2 }} />
          </div>
          {rows.map((r, k) => (
            <div key={r} className="duel-deal" style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", alignItems: "center", gap: 8, marginBottom: 5, animationDelay: `${300 + k * 80}ms` }}>
              <ScoreBar n={a[r]} max={top} color={PLAYER[0].main} flip />
              <span style={{ textAlign: "center", fontSize: 11, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: tint[r] }} />{label[r]}
              </span>
              <ScoreBar n={b[r]} max={top} color={PLAYER[1].main} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <span style={{ display: "flex", justifyContent: "flex-end" }}><Laurel n={a.total} size={48} color={w.p === 0 ? C.gold : C.muted} /></span>
            <span style={{ textAlign: "center", fontFamily: FONT.display, fontSize: 13, color: C.ink, letterSpacing: 1 }}>TOTAL</span>
            <span><Laurel n={b.total} size={48} color={w.p === 1 ? C.gold : C.muted} /></span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <button type="button" onClick={() => { setSt(null); setHist([]); setMode(null); }} style={{ ...btn, marginTop: 20, padding: "11px 26px", fontSize: 14 }}>Play again</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, marginTop: 22 }}>
          <City st={st} i={0} />
          <City st={st} i={1} />
        </div>
      </Shell>
    );
  }

  const pd = st.pending;
  const decider = pd ? pd.player : i;
  const canAct = !pd && myTurn;
  const selSlot = sel !== null ? st.slots.find((s) => s.id === sel) : null;
  const selCard = selSlot?.card && selSlot.card !== "?" ? CARD[selSlot.card] : null;
  const selCost = selCard ? cardCost(st, i, selCard) : null;
  const yellowN = st.players[i].built.filter((id) => CARD[id].color === "yellow").length;
  const rows = LAYOUTS[st.age].rows;
  const maxRow = Math.max(...rows);
  const leftSeat = mode === "direct" ? seat : 0;
  const ageTint = tintFor(st.age);
  const taken = 20 - st.remaining;
  let dealIndex = 0;

  return (
    <Shell status={status}>
      {ageFx && <AgeBanner key={fx.n} age={ageFx.age} starter={st.names[st.turn]} />}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, gap: 10, flexWrap: "wrap",
        background: `linear-gradient(90deg, ${ageTint.b}aa, transparent 40%), ${G.panel}`, border: `1px solid ${C.line}`, borderRadius: 12,
        padding: "8px 12px", boxShadow: SHADOW.panel,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AgeMedal age={st.age} />
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.gold, letterSpacing: 1.2 }}>AGE {ROMAN[st.age]}</b>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
              <Icon name="deck" size={13} color={C.muted} />
              <span>{st.remaining} cards left</span>
              <span style={{ width: 70, height: 4, borderRadius: 4, background: "rgba(0,0,0,.35)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${(taken / 20) * 100}%`, background: `linear-gradient(90deg, ${ageTint.rim}, ${C.gold})`, transition: "width .5s" }} />
              </span>
            </span>
          </span>
        </span>
        <span key={`${st.turn}-${st.age}-${pd?.type ?? ""}`} className="duel-turn" style={{
          fontSize: 14, color: myTurn ? C.gold : C.muted, fontWeight: 700, fontFamily: FONT.display, letterSpacing: .5,
          display: "flex", alignItems: "center", gap: 8, padding: "5px 14px 5px 6px", borderRadius: 999,
          background: `${PLAYER[decider].dark}55`, border: `1px solid ${PLAYER[decider].main}77`,
        }}>
          <Crest seat={decider} size={20} />
          {pd ? `${st.names[decider]} must choose` : myTurn ? `${st.names[i]} to play` : `Waiting for ${st.names[i]}`}
          {myTurn && !pd && <span className="duel-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold, boxShadow: `0 0 8px ${C.gold}` }} />}
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
          <button type="button" onClick={undo} disabled={!hist.length} style={{ ...btnSm, opacity: hist.length ? 1 : .4, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2L1 5l3 3M1.4 5H8a3 3 0 0 1 0 6H5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Undo
          </button>
        </span>
      </div>

      <div style={{ marginBottom: 12 }}><MilitaryTrack st={st} /></div>

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center", justifyContent: "center",
        padding: "8px 12px", borderRadius: 12,
        background: "linear-gradient(180deg, rgba(61,107,76,.22), rgba(42,77,54,.12))",
        border: "1px solid rgba(92,138,109,.35)",
      }}>
        <span style={{ fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: "#9fd0ad", marginRight: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="flask" size={14} color="#9fd0ad" />Progress
        </span>
        {st.board.map((t) => <TokenMedal key={t} id={t} />)}
        {!st.board.length && <span style={{ fontSize: 11, color: C.muted }}>All progress tokens claimed</span>}
      </div>

      <FitBox natural={maxRow * 90 + (st.age === 3 ? 100 : 0) + 40}>
        <div key={st.age} className="duel-mat" style={{
          position: "relative", padding: "18px 20px 22px", borderRadius: 18,
          background: `radial-gradient(90% 70% at 50% 30%, ${shade(ageTint.b, 6)}55, transparent 70%), linear-gradient(180deg, #1c2d32, #142126)`,
          border: `1px solid ${ageTint.rim}33`,
          boxShadow: `inset 0 0 0 6px rgba(0,0,0,.18), inset 0 0 0 7px ${ageTint.rim}22, inset 0 20px 60px -30px rgba(0,0,0,.8), 0 10px 30px -18px rgba(0,0,0,.9)`,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {rows.map((_len, r) => {
              const rowSlots = st.slots.filter((s) => s.row === r);
              const pinch = st.age === 3 && r === 3;
              return (
                <div key={r} style={{ display: "flex", gap: pinch ? 100 : 6, marginTop: r ? -32 : 0, position: "relative", zIndex: r }}>
                  {rowSlots.map((s) => {
                    const delay = (dealIndex++) * 38;
                    if (s.card === null) return <div key={s.id} style={{ width: 84, height: 119 }} />;
                    if (!s.up || s.card === "?") {
                      return <div key={s.id} className="duel-deal" style={{ animationDelay: `${delay}ms` }}><CardBack age={st.age} /></div>;
                    }
                    const card = CARD[s.card];
                    const open = isOpen(st.slots, s);
                    const cst = open ? cardCost(st, i, card) : null;
                    return (
                      <div key={s.id} className="duel-deal" style={{ animationDelay: `${delay}ms` }}>
                        <CardFace
                          card={card}
                          selected={sel === s.id}
                          dim={!open}
                          delay={delay + 120}
                          onClick={open && canAct ? () => setSel(sel === s.id ? null : s.id) : undefined}
                          cost={cst ? { ...cst, affordable: cst.total <= st.players[i].coins } : null}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </FitBox>

      {canAct && selCard && selCost && sel !== null && (
        <ActionDock
          key={sel}
          card={selCard}
          cost={selCost}
          coins={st.players[i].coins}
          discardFor={2 + yellowN}
          wonders={st.players[i].wonders.filter((w) => !w.built).map((w) => ({ id: w.id, cost: wonderCost(st, i, WON[w.id]).total }))}
          closed={st.wondersBuilt >= 7}
          onBuild={() => commit(actBuild(st, sel))}
          onDiscard={() => commit(actDiscard(st, sel))}
          onWonder={(id) => commit(actWonder(st, sel, id))}
          onClose={() => setSel(null)}
        />
      )}
      {canAct && sel === null && (
        <div style={{ textAlign: "center", fontSize: 11.5, color: C.muted, margin: "2px 0 12px", letterSpacing: .3 }}>
          Pick any uncovered card — then build it, sell it, or bury it under a Wonder.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        <City st={st} i={leftSeat} me={mode === "direct"} floats={fxToFloats(fx.items, leftSeat)} />
        <City st={st} i={1 - leftSeat} floats={fxToFloats(fx.items, 1 - leftSeat)} />
      </div>

      <Chronicle st={st} />

      {pd && <Decision st={st} yours={mode === "local" || pd.player === seat} onPick={(c) => commit(resolve(st, c))} />}
    </Shell>
  );
}

function WonderPerks({ id }: { id: string }) {
  const w = WON[id];
  const chip = (key: string, body: React.ReactNode, tip: string) => (
    <span key={key} title={tip} style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, color: C.ink,
      background: "rgba(0,0,0,.25)", border: `1px solid ${C.line}`, borderRadius: 999, padding: "2px 8px 2px 3px",
    }}>{body}</span>
  );
  const out: React.ReactNode[] = [];
  if (w.gainCoins) out.push(chip("c", <><Coin n={w.gainCoins} size={16} />coins</>, `+${w.gainCoins} coins`));
  if (w.oppLoses) out.push(chip("o", <><span style={{ color: "#e8867f", fontWeight: 800, paddingLeft: 4 }}>−{w.oppLoses}</span>to rival</>, `Opponent loses ${w.oppLoses} coins`));
  if (w.shields) out.push(chip("s", <><Shield n={1} />{w.shields}</>, `${w.shields} shields`));
  if (w.again) out.push(chip("a", <><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M11 4A5 5 0 1 0 12 8" stroke={C.gold} strokeWidth="1.6" fill="none" strokeLinecap="round" /><path d="M8.6 3.6L11.4 1.4l.4 3.4z" fill={C.gold} /></svg>Play again</>, "Take another turn"));
  if (w.destroy) out.push(chip("d", <><ColorTab c={w.destroy} size={10} />destroy</>, `Destroy a ${w.destroy} card`));
  if (w.library) out.push(chip("l", <><TokenDisc id="philosophy" size={16} />archive</>, "Pick from 3 unused progress tokens"));
  if (w.mausoleum) out.push(chip("m", <><Icon name="scroll" size={13} color={C.gold} />raise discard</>, "Build a discarded card for free"));
  if (w.prodChoice) out.push(chip("p", w.prodChoice.map((r) => <Pip key={r} r={r} size={13} />), `Produces one of ${w.prodChoice.join(" / ")}`));
  return <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{out}</div>;
}

function ScoreBar({ n, max, color, flip }: { n: number; max: number; color: string; flip?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: flip ? "row-reverse" : "row" }}>
      <span style={{ flex: 1, height: 12, borderRadius: 6, background: "rgba(0,0,0,.3)", overflow: "hidden", display: "flex", justifyContent: flip ? "flex-end" : "flex-start" }}>
        <span className="duel-bar" style={{
          width: `${(n / max) * 100}%`, height: "100%", borderRadius: 6,
          background: `linear-gradient(180deg, ${shade(color, 18)}, ${shade(color, -14)})`,
          boxShadow: `0 0 10px -2px ${color}`,
        }} />
      </span>
      <b style={{ width: 22, textAlign: "center", fontSize: 13, color: n ? C.ink : C.muted }}>{n}</b>
    </span>
  );
}

function Confetti({ colors }: { colors: string[] }) {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 70 }}>
      {Array.from({ length: 70 }, (_, k) => {
        const left = (k * 37.3) % 100;
        const delay = (k * 113) % 2400;
        const dur = 2600 + ((k * 211) % 1800);
        const size = 5 + (k % 4) * 2;
        return (
          <span key={k} className="duel-confetti" style={{
            position: "absolute", top: -20, left: `${left}%`, width: size, height: size * (k % 3 ? .45 : 1),
            background: colors[k % colors.length], borderRadius: k % 5 === 0 ? "50%" : 1,
            animationDelay: `${delay}ms`, animationDuration: `${dur}ms`,
          }} />
        );
      })}
    </div>
  );
}

function AgeMedal({ age }: { age: number }) {
  const t = tintFor(age);
  return (
    <span style={{
      width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(circle at 35% 30%, ${shade(t.a, 20)}, ${t.a} 55%, ${t.b})`,
      border: `2px solid ${t.rim}`, boxShadow: `0 0 0 2px rgba(0,0,0,.4), 0 0 16px -4px ${t.rim}`,
      fontFamily: FONT.display, fontWeight: 700, fontSize: t.label.length > 2 ? 13 : 16, color: "#fff4dc",
      textShadow: "0 1px 2px rgba(0,0,0,.6)", flex: "0 0 auto",
    }}>{t.label}</span>
  );
}

function AgeBanner({ age, starter }: { age: number; starter: string }) {
  const t = tintFor(age);
  const lines = ["", "The first structure is dealt.", "The middle age. The cards grow costlier.", "The final age. The guilds wait in the dark."];
  return (
    <div className="duel-age" aria-live="polite" style={{
      position: "fixed", inset: 0, zIndex: 95, pointerEvents: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(60% 40% at 50% 50%, ${t.b}ee, rgba(8,14,16,.6) 70%, transparent)`,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <span style={{
            width: 96, height: 96, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: `radial-gradient(circle at 35% 30%, ${shade(t.a, 24)}, ${t.a} 55%, ${t.b})`,
            border: `3px solid ${t.rim}`, boxShadow: `0 0 0 4px rgba(0,0,0,.35), 0 0 60px -6px ${t.rim}`,
            fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: "#fff4dc", textShadow: "0 2px 4px rgba(0,0,0,.6)",
          }}>{t.label}</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 44, fontWeight: 700, letterSpacing: 8, color: "#fff4dc", textShadow: `0 0 30px ${t.rim}` }}>AGE {ROMAN[age]}</div>
        <div style={{ width: 160, height: 1, margin: "8px auto", background: `linear-gradient(90deg, transparent, ${t.rim}, transparent)` }} />
        <div style={{ fontSize: 13, color: "#e6dcc4", letterSpacing: .4 }}>{lines[age]}</div>
        <div style={{ fontSize: 12, color: C.gold, marginTop: 6, letterSpacing: .4 }}>{starter} plays first</div>
      </div>
    </div>
  );
}

function FitBox({ natural, children }: { natural: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((list) => setWidth(list[0]?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const zoom = width ? Math.min(1, width / natural) : 1;
  return (
    <div ref={ref} style={{ marginBottom: 12 }}>
      <div style={{ zoom }}>{children}</div>
    </div>
  );
}

interface ActionDockProps {
  card: Card;
  cost: { total: number; trade: number; chained: boolean };
  coins: number;
  discardFor: number;
  wonders: { id: string; cost: number }[];
  closed: boolean;
  onBuild: () => void;
  onDiscard: () => void;
  onWonder: (id: string) => void;
  onClose: () => void;
}

function ActionDock({ card, cost, coins, discardFor, wonders, closed, onBuild, onDiscard, onWonder, onClose }: ActionDockProps) {
  const canBuild = cost.total <= coins;
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const tile = (on: boolean): React.CSSProperties => ({
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
    minWidth: 96, padding: "9px 10px", borderRadius: 10, cursor: on ? "pointer" : "not-allowed",
    border: `1px solid ${on ? "#a87f31" : C.line}`, opacity: on ? 1 : .45,
    color: on ? "#2a2109" : C.muted, fontWeight: 700, fontSize: 12,
    background: on ? G.gold : G.panel2,
    boxShadow: on ? "inset 0 1px 0 rgba(255,255,255,.35), 0 4px 10px -4px rgba(0,0,0,.7)" : "none",
  });
  return (
    <div ref={ref} className="duel-dock" role="dialog" aria-label={`${card.name} actions`} style={{
      position: "relative", zIndex: 5, marginBottom: 12, scrollMarginBottom: 16,
      background: `linear-gradient(180deg, rgba(40,62,68,.97), rgba(26,40,45,.98))`,
      border: `1px solid ${C.gold}77`, borderRadius: 14, padding: "12px 30px 12px 12px",
      boxShadow: `0 -10px 40px -10px rgba(0,0,0,.85), 0 0 30px -14px ${C.gold}`,
      display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
      backdropFilter: "blur(6px)",
    }}>
      <CardFace card={card} w={104} />
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <ColorTab c={card.color} size={10} />
          <b style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: .4 }}>{card.name}</b>
        </div>
        <ul style={{ margin: "0 0 8px", padding: 0, listStyle: "none", fontSize: 12, color: "#cfdadc", lineHeight: 1.6 }}>
          {describeCard(card).map((d) => (
            <li key={d} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.gold }} />{d}
            </li>
          ))}
        </ul>
        <div style={{ fontSize: 11.5, color: C.muted, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {cost.chained
            ? <><Icon name="chain" size={13} color="#8fd0a0" /><span style={{ color: "#8fd0a0" }}>Free by chain{card.chainFrom ? ` from ${CARD[card.chainFrom].name}` : ""}</span></>
            : <>Costs you <Coin n={cost.total} size={16} />{cost.trade > 0 && <span>({cost.trade} on trade)</span>} · you hold <Coin n={coins} size={16} /></>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch", flex: "100 1 320px", justifyContent: "flex-end" }}>
        <button type="button" disabled={!canBuild} onClick={onBuild} style={tile(canBuild)}>
          <Icon name="hammer" size={20} color={canBuild ? "#2a2109" : C.muted} />
          Build
          <span style={{ fontSize: 10, fontWeight: 600, opacity: .8 }}>{cost.chained || !cost.total ? "free" : coinsText(cost.total)}</span>
        </button>
        <button type="button" onClick={onDiscard} style={{ ...tile(true), background: "linear-gradient(180deg, #4b6b72, #33525a)", color: C.ink, border: `1px solid ${C.line}` }}>
          <Icon name="coins" size={20} color="#f2cd7c" />
          Sell
          <span style={{ fontSize: 10, fontWeight: 600, color: "#f2cd7c" }}>+{coinsText(discardFor)}</span>
        </button>
        {!closed && wonders.map((w) => {
          const ok = w.cost <= coins;
          return (
            <button key={w.id} type="button" disabled={!ok} onClick={() => onWonder(w.id)} title={WON[w.id].text} style={{
              ...tile(ok), padding: 0, overflow: "hidden", minWidth: 0, width: 112, flex: "1 1 96px", maxWidth: 132, gap: 0,
              background: ok ? "linear-gradient(180deg, #7b6842, #4e4129)" : G.panel2, color: ok ? "#fff4dc" : C.muted,
            }}>
              <div style={{ width: "100%", aspectRatio: "120 / 50", overflow: "hidden" }}><WonderArt id={w.id} w="100%" h="100%" dim={!ok} /></div>
              <span style={{ fontSize: 10.5, padding: "4px 6px 0", fontFamily: FONT.display, lineHeight: 1.1 }}>{WON[w.id].name.replace(/^The /, "")}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 0 5px", opacity: .85 }}>{w.cost ? coinsText(w.cost) : "free"}</span>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onClose} aria-label="Put the card back" style={{
        position: "absolute", top: 6, right: 8, background: "transparent", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", lineHeight: 1,
      }}>×</button>
    </div>
  );
}

function logIcon(line: string): React.ReactNode {
  if (/^Age /.test(line)) return <Icon name="crown" size={13} color={C.gold} />;
  if (/destroyed/.test(line)) return <Icon name="sword" size={13} color="#e8867f" />;
  if (/discarded/.test(line)) return <Icon name="coins" size={13} color="#f2cd7c" />;
  if (/took/.test(line)) return <Icon name="flask" size={13} color="#9fd0ad" />;
  if (/raised/.test(line)) return <Icon name="scroll" size={13} color={C.gold} />;
  if (WONDERS.some((w) => line.includes(w.name))) return <Icon name="pyramid" size={13} color={C.gold} />;
  return <Icon name="hammer" size={13} color={C.muted} />;
}

function Chronicle({ st }: { st: GameState }) {
  return (
    <details style={{ marginTop: 14, background: G.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 12px", boxShadow: SHADOW.panel }}>
      <summary style={{ fontSize: 12.5, color: C.ink, cursor: "pointer", fontFamily: FONT.display, letterSpacing: .4, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="book" size={15} color={C.gold} />Chronicle
        <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted }}>· {st.log.length} entries · discard pile {st.discard.length}</span>
      </summary>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 10 }}>
        <div style={{ fontSize: 11.5, color: "#cfdadc", lineHeight: 1.5, maxHeight: 220, overflowY: "auto" }}>
          {[...st.log].reverse().map((l, k) => (
            <div key={`${st.log.length - k}`} style={{ display: "flex", gap: 7, alignItems: "center", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
              {logIcon(l)}<span>{l}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 1.3, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Discard pile</div>
          {st.discard.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", paddingLeft: 18 }}>
              {st.discard.map((id, k) => (
                <div key={`${id}${k}`} style={{ marginLeft: -18, transform: `rotate(${((k * 7) % 9) - 4}deg)` }}>
                  <CardFace card={CARD[id]} w={56} />
                </div>
              ))}
            </div>
          ) : <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Nothing sold yet.</span>}
        </div>
      </div>
    </details>
  );
}

function Decision({ st, yours, onPick }: { st: GameState; yours: boolean; onPick: (c: string | number) => void }) {
  const pd = st.pending!;
  let title = "", sub = "", options: React.ReactNode = null;
  if (pd.type === "progress" || pd.type === "library") {
    title = pd.type === "library" ? "The Great Library opens its archive" : "A scientific pair — claim a progress token";
    sub = pd.type === "library" ? "Three forgotten discoveries. Keep one." : "Matching symbols reward you with a lasting advantage.";
    const list = pd.type === "library" ? pd.options : st.board;
    options = list.map((t, k) => (
      <button key={t} type="button" disabled={!yours} onClick={() => onPick(t)} className="duel-card duel-deal is-live" style={{ ...optBtn(yours), animationDelay: `${k * 80}ms`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, width: 160 }}>
        <TokenDisc id={t} size={58} glow />
        <b style={{ fontSize: 13, fontFamily: FONT.display, letterSpacing: .3 }}>{TOK[t].name}</b>
        <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.4 }}>{TOK[t].text}</div>
      </button>
    ));
  }
  if (pd.type === "destroy") {
    title = `Tear down one of ${st.names[1 - pd.player]}'s ${pd.color} buildings`;
    sub = "Your Wonder's wrath falls on a single card.";
    options = st.players[1 - pd.player].built.filter((id) => CARD[id].color === pd.color).map((id, k) => (
      <div key={`${id}${k}`} className="duel-doom duel-deal" style={{ animationDelay: `${k * 80}ms` }}>
        <CardFace card={CARD[id]} w={96} dim={!yours} onClick={yours ? () => onPick(id) : undefined} />
      </div>
    ));
  }
  if (pd.type === "mausoleum") {
    title = "Raise a card from the discard pile";
    sub = "The Mausoleum rebuilds what was lost, free of charge.";
    options = st.discard.map((id, k) => (
      <div key={`${id}${k}`} className="duel-deal" style={{ animationDelay: `${k * 40}ms` }}>
        <CardFace card={CARD[id]} w={88} dim={!yours} onClick={yours ? () => onPick(id) : undefined} />
      </div>
    ));
  }
  if (pd.type === "first") {
    title = `Age ${ROMAN[pd.next]} approaches`;
    sub = `${st.names[pd.player]} has the weaker army and chooses who opens the next age.`;
    options = [0, 1].map((j) => (
      <button key={j} type="button" disabled={!yours} onClick={() => onPick(j)} className="duel-card is-live" style={{
        ...optBtn(yours), width: 180, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 16,
        borderTop: `3px solid ${PLAYER[j].main}`,
      }}>
        <Crest seat={j} size={44} />
        <b style={{ fontSize: 14, fontFamily: FONT.display, color: PLAYER[j].light }}>{st.names[j]} starts</b>
      </button>
    ));
  }
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 88, display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
      background: "radial-gradient(circle at 50% 45%, rgba(10,18,20,.55), rgba(5,9,10,.85))", backdropFilter: "blur(3px)",
    }}>
      <div className="duel-pop" role="dialog" aria-label={title} style={{
        maxWidth: 760, width: "100%", maxHeight: "90vh", overflowY: "auto",
        background: `linear-gradient(180deg, ${PLAYER[pd.player].dark}55, transparent 120px), ${G.panel}`,
        border: `1px solid ${C.gold}88`, borderRadius: 16, padding: "20px 20px 22px",
        boxShadow: `0 30px 80px -20px rgba(0,0,0,.95), 0 0 60px -30px ${C.gold}`, textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Crest seat={pd.player} size={30} /></div>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, color: C.ink, fontWeight: 700, fontFamily: FONT.display, letterSpacing: .5 }}>{title}</h2>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: C.muted }}>{yours ? sub : `Waiting for ${st.names[pd.player]}…`}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>{options}</div>
      </div>
    </div>
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
                  <span style={{ fontSize: 11 }}>{SCI[k].label} {n ? `×${n}` : "— Law token only"}</span>
                </span>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5 }}>
            Six of the seven are printed on two green cards each, so every one of them can be
            paired. The scales are on no card at all: the Law progress token is the only way to
            hold that seventh symbol.
          </div>
        </Sec>

        <Sec title="Progress tokens">
          Five are available each game; the other five sit in the archive, reachable only through
          the Great Library.
          <div style={{ marginTop: 8 }}>
            {TOKENS.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <TokenDisc id={t.id} size={30} />
                <span><b style={{ color: C.ink, fontWeight: 500 }}>{t.name}</b><br />{t.text}</span>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="Wonders">
          {WONDERS.map((w) => (
            <div key={w.id} style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "96px 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${C.gold}44`, aspectRatio: "120 / 64" }}><WonderArt id={w.id} w="100%" h="100%" /></div>
              <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ color: C.ink, fontWeight: 500 }}>{w.name}</span>
                <CostRow cost={w.cost} size={11} />
                {w.vp > 0 && <VP n={w.vp} />}
                {(w.shields ?? 0) > 0 && <Shield n={w.shields!} />}
              </div>
              <div style={{ fontSize: 11.5 }}>{w.text}</div>
              </div>
            </div>
          ))}
        </Sec>

        <Sec title="Guilds">
          Guilds count against whichever city has more — which is often your opponent's. Coins are
          taken once, when you build it; the points come at the end.
          <div style={{ marginTop: 8 }}>
            {guilds.map((g) => (
              <Row key={g.id} head={g.name.replace(" Guild", "")}>
                {g.guild?.treasury ? "1 VP per 3 coins in the richest treasury"
                  : g.guild?.wonders ? "2 VP per Wonder built by whoever has the most"
                  : `1 coin and 1 VP per ${(g.guild?.colors ?? []).join(" or ")} card`}
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
.duel-card.is-sel         { z-index: 4; }
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

.duel-pawn > svg { animation: duel-bob 2.4s ease-in-out infinite; }
@keyframes duel-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }

.duel-fade { animation: duel-fade .22s ease-out; }

.duel-deal { animation: duel-deal .5s cubic-bezier(.2,.9,.3,1.1) backwards; }
@keyframes duel-deal {
  from { opacity: 0; transform: translateY(-46px) rotate(-7deg) scale(.86); }
  to { opacity: 1; transform: none; }
}
.duel-flip { animation: duel-flip .45s cubic-bezier(.3,.8,.4,1) backwards; transform-style: preserve-3d; }
@keyframes duel-flip {
  from { transform: perspective(500px) rotateY(88deg); filter: brightness(.6); }
  to { transform: perspective(500px) rotateY(0); }
}
.duel-card.is-sel { animation: duel-rise .18s cubic-bezier(.2,.8,.3,1); }
.duel-card.is-live .duel-price { transition: transform .16s; }
.duel-card.is-live:hover .duel-price { transform: scale(1.12); }
.duel-card.is-live::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: linear-gradient(115deg, transparent 35%, rgba(255,250,230,.38) 50%, transparent 65%);
  background-size: 260% 100%; background-position: 130% 0; transition: background-position .6s ease;
}
.duel-card.is-live:hover::after { background-position: -30% 0; }
.duel-card.is-live:not(.is-sel):not(:hover) { box-shadow: 0 0 0 1.5px ${C.gold}55, ${SHADOW.card} !important; }

.duel-float { animation: duel-float 2.4s cubic-bezier(.2,.8,.3,1) forwards; opacity: 0; }
@keyframes duel-float {
  0% { opacity: 0; transform: translateY(14px) scale(.8); }
  12% { opacity: 1; transform: translateY(0) scale(1.08); }
  22% { transform: translateY(-2px) scale(1); }
  75% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-26px); }
}

.duel-age { animation: duel-age 2.6s ease-in-out forwards; }
@keyframes duel-age {
  0% { opacity: 0; transform: scale(1.12); }
  14% { opacity: 1; transform: scale(1); }
  78% { opacity: 1; }
  100% { opacity: 0; visibility: hidden; }
}

.duel-turn { animation: duel-turn .5s cubic-bezier(.2,.9,.3,1.2); }
@keyframes duel-turn { from { opacity: 0; transform: translateY(-6px) scale(.92); } to { opacity: 1; transform: none; } }

.duel-dock { animation: duel-dock .28s cubic-bezier(.2,.9,.3,1.1); }
@keyframes duel-dock { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }

.duel-pop { animation: duel-pop .32s cubic-bezier(.2,.9,.3,1.2); }
@keyframes duel-pop { from { opacity: 0; transform: scale(.9) translateY(10px); } to { opacity: 1; transform: none; } }

.duel-city.is-active { animation: duel-breathe 3s ease-in-out infinite; }
@keyframes duel-breathe {
  0%,100% { box-shadow: ${SHADOW.panel}, 0 0 0 1px ${C.gold}33, 0 0 30px -14px ${C.gold}88; }
  50% { box-shadow: ${SHADOW.panel}, 0 0 0 1px ${C.gold}55, 0 0 36px -8px ${C.gold}aa; }
}

.duel-wonder { transition: transform .18s; }
.duel-wonder:hover { transform: translateY(-2px); }
.duel-wonder.is-built::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 40%, rgba(255,240,200,.32) 50%, transparent 60%);
  background-size: 280% 100%; animation: duel-shine 5s ease-in-out infinite;
}
@keyframes duel-shine { 0%, 60% { background-position: 140% 0; } 100% { background-position: -40% 0; } }

.duel-mini { transition: transform .14s; }
.duel-mini:hover { transform: translateX(3px); z-index: 20 !important; }
.duel-medal { transition: transform .16s; cursor: help; }
.duel-medal:hover { transform: translateY(-3px) scale(1.06); }

.duel-doom { position: relative; }
.duel-doom::after {
  content: "✕"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 54px; color: rgba(255,120,110,.0); pointer-events: none; transition: color .15s, background .15s; border-radius: 8px;
}
.duel-doom:hover::after { color: rgba(255,120,110,.9); background: rgba(120,20,15,.28); }

.duel-confetti { animation-name: duel-confetti; animation-timing-function: linear; animation-iteration-count: 2; animation-fill-mode: both; }
@keyframes duel-confetti {
  0% { transform: translateY(0) rotate(0); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: .8; }
}
.duel-bar { animation: duel-bar .9s cubic-bezier(.2,.8,.3,1) backwards; animation-delay: inherit; transform-origin: left; }
@keyframes duel-bar { from { width: 0; } }
.duel-crown { animation: duel-crown 1s cubic-bezier(.2,.9,.3,1.3); }
@keyframes duel-crown { from { opacity: 0; transform: translateY(-30px) scale(.6); } to { opacity: 1; transform: none; } }
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
  .duel-confetti, .duel-age { display: none; }
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

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const MEANDER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='12'%3E%3Cpath d='M0 11h10V3H4v4h3M12 1v10h10V3h-6v4h3' fill='none' stroke='%23d6a850' stroke-width='1.3' stroke-opacity='.4'/%3E%3C/svg%3E")`;

function Shell({ children, status }: { children: React.ReactNode; status?: string }) {
  const [rules, setRules] = useState(false);
  return (
    <div style={{
      background: `${NOISE}, radial-gradient(70% 50% at 50% 0%, rgba(214,168,80,.08), transparent 70%), ${G.board}`,
      backgroundAttachment: "fixed", minHeight: "100vh",
      padding: "0 14px 14px", color: C.ink, fontFamily: FONT.body,
    }}>
      <BoardStyle />
      <div aria-hidden="true" style={{ height: 12, margin: "0 -14px 14px", backgroundImage: MEANDER, backgroundRepeat: "repeat-x", backgroundPosition: "center", borderBottom: `1px solid ${C.gold}22`, opacity: .9 }} />
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
      <div style={{ maxWidth: 520, margin: "10px auto 40px" }}>
        <div className="duel-fade" style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", marginBottom: 14, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.gold}44`, boxShadow: `0 20px 50px -20px rgba(0,0,0,.9), 0 0 40px -20px ${C.gold}` }}>
            <LobbyScene width={560} />
          </div>
          <h1 style={{
            fontFamily: FONT.display, fontSize: 46, margin: "0 0 8px", fontWeight: 700,
            letterSpacing: 8, textIndent: 8, color: C.ink,
            textShadow: `0 0 44px ${C.gold}44`,
          }}>DUEL</h1>
          <div style={{
            width: 78, height: 1, margin: "0 auto 14px",
            background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
          }} />
          <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.6 }}>
            Three ages, two cities, one table. Raise wonders, field armies, chase discoveries.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {([["sword", "Military", "March on their capital", CARDCOL.red], ["flask", "Science", "Six different symbols", CARDCOL.green], ["crown", "Points", "Most glory after Age III", C.gold]] as const).map(([icon, name, text, col]) => (
              <span key={name} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 8px", borderRadius: 10,
                background: `linear-gradient(180deg, ${col}22, rgba(0,0,0,.18))`, border: `1px solid ${col}55`, textAlign: "left",
              }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${col}33`, border: `1px solid ${col}88` }}>
                  <Icon name={icon} size={15} color={shade(col, 25)} />
                </span>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: 11.5, color: C.ink, fontFamily: FONT.display, letterSpacing: .4 }}>{name}</b>
                  <span style={{ fontSize: 10, color: C.muted }}>{text}</span>
                </span>
              </span>
            ))}
          </div>
        </div>

        <div style={{
          background: G.panel, borderRadius: 12, padding: 18,
          border: `1px solid ${C.line}`, boxShadow: SHADOW.panel, marginBottom: 14,
        }}>
          <div style={{
            fontFamily: FONT.display, fontSize: 14, fontWeight: 600, marginBottom: 12,
            letterSpacing: .6, color: C.ink,
            display: "flex", alignItems: "center", gap: 8,
          }}><span style={{ display: "flex" }}><Crest seat={0} size={16} /><span style={{ marginLeft: -4 }}><Crest seat={1} size={16} /></span></span>Same screen</div>
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
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="2" width="8" height="12" rx="1.6" fill="none" stroke={PLAYER[0].main} strokeWidth="1.4" /><rect x="13" y="2" width="8" height="12" rx="1.6" fill="none" stroke={PLAYER[1].main} strokeWidth="1.4" /><path d="M9.6 8h2.8" stroke={C.gold} strokeWidth="1.2" strokeDasharray="1 1" /></svg>
              Separate devices
            </span>
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
