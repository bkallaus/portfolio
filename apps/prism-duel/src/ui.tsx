import type { CSSProperties, ReactNode } from "react";
import {
  C,
  FONT,
  G,
  NEUTRAL_CARD_COLOR,
  SHADOW,
  TOKEN_COLOR,
  TOKEN_GLYPH,
  TOKEN_INK,
  TOKEN_LABEL,
  shade,
  tokenFill,
} from "./theme.ts";
import type { GemColor, TokenKind } from "./theme.ts";
import { abilityText, card, royal } from "./cards.ts";
import type { Card } from "./cards.ts";

export function Panel({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: G.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        boxShadow: SHADOW.panel,
        padding: 12,
        ...style,
      }}
    >
      {title && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              margin: 0,
              font: `600 12px/1 ${FONT.body}`,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            {title}
          </h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  tone = "plain",
  disabled,
  style,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "plain" | "gold" | "danger" | "ghost";
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
}) {
  const tones: Record<string, CSSProperties> = {
    plain: { background: G.panelLit, border: `1px solid ${C.line}`, color: C.ink },
    gold: { background: G.accent, border: "1px solid #8d6a22", color: "#2a1e05" },
    danger: { background: "#3a2024", border: `1px solid ${C.danger}`, color: "#f4c9c5" },
    ghost: { background: "transparent", border: "1px solid transparent", color: C.muted },
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 12px",
        borderRadius: 9,
        font: `600 13px/1.2 ${FONT.body}`,
        opacity: disabled ? 0.42 : 1,
        transition: "transform .12s ease, filter .12s ease",
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function TokenPip({
  kind,
  size = 26,
  faded,
  count,
}: {
  kind: TokenKind;
  size?: number;
  faded?: boolean;
  count?: number;
}) {
  return (
    <span
      title={TOKEN_LABEL[kind]}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: tokenFill(kind),
        border: `1px solid ${shade(TOKEN_COLOR[kind], -38)}`,
        color: TOKEN_INK[kind],
        font: `700 ${Math.round(size * 0.46)}px/1 ${FONT.body}`,
        boxShadow: "0 1px 2px rgba(0,0,0,.5)",
        opacity: faded ? 0.3 : 1,
        flex: "0 0 auto",
      }}
    >
      {count === undefined ? TOKEN_GLYPH[kind] : count}
    </span>
  );
}

export function CrownMark({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <span
      title={`${count} crown${count === 1 ? "" : "s"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        font: `700 ${size - 3}px/1 ${FONT.body}`,
        color: C.accent,
      }}
    >
      <span style={{ fontSize: size }}>♔</span>
      {count}
    </span>
  );
}

const cardAccent = (entry: Card, chosen?: GemColor): string => {
  const colour = entry.wildBonus ? chosen : entry.color;
  return colour ? TOKEN_COLOR[colour] : NEUTRAL_CARD_COLOR;
};

export function CardFace({
  id,
  chosen,
  onClick,
  selected,
  affordable,
  compact,
  label,
}: {
  id: string;
  chosen?: GemColor;
  onClick?: () => void;
  selected?: boolean;
  affordable?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const entry = card(id);
  const accent = cardAccent(entry, chosen);
  const colour = entry.wildBonus ? chosen : entry.color;
  const ink = colour ? TOKEN_INK[colour] : "#f4f6fa";
  const width = compact ? 74 : 104;
  const height = compact ? 98 : 146;
  const costs = Object.entries(entry.cost) as Array<[TokenKind, number]>;
  const body = (
    <>
      <div
        style={{
          height: compact ? 18 : 24,
          background: `linear-gradient(90deg, ${accent} 0%, ${shade(accent, -18)} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6px",
          color: ink,
          textShadow: ink === "#2b2b2b" ? "none" : "0 1px 2px rgba(0,0,0,.45)",
          font: `700 ${compact ? 10 : 12}px/1 ${FONT.body}`,
        }}
      >
        <span>{entry.points > 0 ? `${entry.points}` : ""}</span>
        <span>{entry.crowns > 0 ? "♔".repeat(entry.crowns) : ""}</span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: 3,
        }}
      >
        {entry.bonus > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: compact ? 24 : 30,
              height: compact ? 24 : 30,
              borderRadius: 8,
              background: entry.wildBonus && !chosen ? "#cdd3dc" : accent,
              color: entry.wildBonus && !chosen ? "#2b2b2b" : ink,
              textShadow: ink === "#2b2b2b" ? "none" : "0 1px 2px rgba(0,0,0,.4)",
              font: `700 ${compact ? 12 : 15}px/1 ${FONT.body}`,
              border: `1px solid ${shade(accent, -28)}`,
            }}
          >
            +{entry.bonus}
          </span>
        )}
        {entry.wildBonus && (
          <span style={{ font: `600 ${compact ? 7 : 8}px/1.1 ${FONT.body}`, color: "#6b6456" }}>
            ANY COLOUR
          </span>
        )}
        {entry.ability && !compact && (
          <span
            title={abilityText(entry.ability)}
            style={{
              font: `600 8px/1.15 ${FONT.body}`,
              color: "#6b6456",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: ".05em",
            }}
          >
            {ABILITY_TAG[entry.ability]}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          padding: 4,
          borderTop: "1px solid rgba(0,0,0,.12)",
          justifyContent: "center",
        }}
      >
        {costs.map(([kind, amount]) => (
          <span
            key={kind}
            title={`${amount} ${TOKEN_LABEL[kind]}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: compact ? 15 : 18,
              height: compact ? 15 : 18,
              borderRadius: "50%",
              background: tokenFill(kind),
              border: `1px solid ${shade(TOKEN_COLOR[kind], -40)}`,
              color: TOKEN_INK[kind],
              font: `700 ${compact ? 9 : 11}px/1 ${FONT.body}`,
            }}
          >
            {amount}
          </span>
        ))}
      </div>
    </>
  );
  const frame: CSSProperties = {
    width,
    height,
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: 9,
    background: G.card,
    color: "#2c2a24",
    padding: 0,
    border: selected ? `2px solid ${C.accent}` : "1px solid rgba(0,0,0,.35)",
    boxShadow: selected ? SHADOW.cardUp : SHADOW.card,
    outline: affordable ? `1px solid ${C.good}` : "none",
    textAlign: "left",
  };
  if (!onClick) return <div style={frame}>{body}</div>;
  return (
    <button type="button" aria-label={label ?? `card ${id}`} onClick={onClick} style={frame}>
      {body}
    </button>
  );
}

const ABILITY_TAG: Record<string, string> = {
  gem: "+1 matching token",
  anyGem: "+1 any token",
  steal: "steal a token",
  privilege: "+1 privilege",
  again: "play again",
};

export function CardBack({ count, tier }: { count: number; tier: number }) {
  return (
    <div
      style={{
        width: 48,
        height: 146,
        borderRadius: 9,
        background: G.cardBack,
        border: `1px solid ${C.line}`,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: C.muted,
        font: `600 11px/1 ${FONT.body}`,
      }}
    >
      <span style={{ font: `700 15px/1 ${FONT.display}`, color: C.ink }}>{"I".repeat(tier)}</span>
      <span>{count}</span>
    </div>
  );
}

export function RoyalFace({
  id,
  onClick,
  selectable,
}: {
  id: string;
  onClick?: () => void;
  selectable?: boolean;
}) {
  const entry = royal(id);
  const frame: CSSProperties = {
    width: 104,
    minHeight: 72,
    borderRadius: 9,
    padding: 8,
    background: "linear-gradient(170deg, #f6ead0 0%, #e7d6b0 100%)",
    color: "#3a2f16",
    border: selectable ? `2px solid ${C.accent}` : "1px solid rgba(0,0,0,.3)",
    boxShadow: SHADOW.card,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    textAlign: "left",
  };
  const body = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ font: `700 11px/1.1 ${FONT.display}` }}>{entry.name}</strong>
        <span style={{ font: `700 13px/1 ${FONT.body}` }}>{entry.points}</span>
      </div>
      <span style={{ font: `500 9px/1.25 ${FONT.body}`, color: "#5d5234" }}>{entry.text}</span>
    </>
  );
  if (!onClick) return <div style={frame}>{body}</div>;
  return (
    <button type="button" onClick={onClick} style={frame}>
      {body}
    </button>
  );
}

export const EmptySlot = ({ width = 104, height = 146 }: { width?: number; height?: number }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 9,
      flex: "0 0 auto",
      border: `1px dashed ${C.line}`,
      background: "rgba(0,0,0,.18)",
      boxShadow: SHADOW.sunk,
    }}
  />
);
