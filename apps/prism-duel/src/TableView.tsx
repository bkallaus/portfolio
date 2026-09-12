import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  C,
  FONT,
  G,
  GEMS,
  SHADOW,
  SPENDABLE,
  TOKEN_COLOR,
  TOKEN_GLYPH,
  TOKEN_INK,
  TOKEN_LABEL,
  shade,
  tokenFill,
} from "./theme.ts";
import type { TokenKind } from "./theme.ts";
import { card, royal } from "./cards.ts";
import {
  BOARD_SIZE,
  COLOUR_POINTS_TO_WIN,
  PRIVILEGE_SUPPLY,
  RESERVE_LIMIT,
  TOKEN_LIMIT,
  canBuy,
  canReplenish,
  canReserve,
  canTakeTokens,
  canSpendPrivilege,
  mustReplenish,
  payment,
  view,
} from "./engine.ts";
import type { GameState, Move, Resolution } from "./engine.ts";
import { Button, CardBack, CardFace, CrownMark, EmptySlot, Panel, RoyalFace, TokenPip } from "./ui.tsx";

export interface TableProps {
  state: GameState;
  seat: number | null;
  onMove: (move: Move) => void;
  onResolve: (choice: Resolution) => void;
  onUndo?: () => void;
  onNewGame: () => void;
  statusLine: string;
}

const CELLS: number[] = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, cell) => cell);
const PRIVILEGE_SLOTS: number[] = Array.from({ length: PRIVILEGE_SUPPLY }, (_, slot) => slot);
const slotsOf = (width: number): number[] => Array.from({ length: width }, (_, slot) => slot);

const actorOf = (state: GameState): number =>
  state.pending.length > 0 ? state.pending[0].player : state.turn;

export function TableView({
  state,
  seat,
  onMove,
  onResolve,
  onUndo,
  onNewGame,
  statusLine,
}: TableProps) {
  const [picked, setPicked] = useState<number[]>([]);
  const [focused, setFocused] = useState<string | null>(null);
  const [spending, setSpending] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const actor = actorOf(state);
  const home = seat ?? 0;
  const rival = 1 - home;
  const mine = seat === null || seat === actor;
  const pending = state.pending[0] ?? null;
  const locked = Boolean(state.winner) || !mine;

  const reset = () => {
    setPicked([]);
    setFocused(null);
    setSpending(false);
  };

  const togglePick = (cell: number) => {
    if (locked) return;
    if (pending) {
      if (pending.type === "boardGem") onResolve({ kind: "boardGem", cell });
      return;
    }
    if (spending) {
      onMove({ kind: "privilege", cell });
      reset();
      return;
    }
    setPicked((current) => {
      if (current.includes(cell)) return current.filter((each) => each !== cell);
      const attempt = [...current, cell].sort((a, b) => a - b);
      if (canTakeTokens(state, attempt)) return attempt;
      return canTakeTokens(state, [cell]) ? [cell] : current;
    });
  };

  const highlight = useMemo(() => {
    if (pending?.type === "boardGem") {
      return new Set(
        state.board
          .map((token, cell) =>
            token !== null && token !== "gold" && (pending.color === null || token === pending.color)
              ? cell
              : -1
          )
          .filter((cell) => cell >= 0)
      );
    }
    if (spending) {
      return new Set(
        state.board
          .map((token, cell) => (token !== null && token !== "gold" ? cell : -1))
          .filter((cell) => cell >= 0)
      );
    }
    return null;
  }, [pending, spending, state.board]);

  const takeReady = picked.length > 0 && canTakeTokens(state, picked);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: G.table,
        padding: "14px clamp(10px, 3vw, 28px) 28px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Header
        state={state}
        statusLine={statusLine}
        onNewGame={onNewGame}
        onUndo={onUndo}
        onToggleLog={() => setShowLog((open) => !open)}
        showLog={showLog}
      />

      {pending && mine && <Prompt state={state} onResolve={onResolve} />}
      {state.winner && <Verdict state={state} onNewGame={onNewGame} />}

      <div className="prism-layout">
        <div className="prism-column">
          <Panel
            title="The board"
            right={
              <span style={{ font: `500 11px/1 ${FONT.body}`, color: C.muted }}>
                bag {state.bag.length}
              </span>
            }
          >
            <PrivilegeRow state={state} />
            <TokenGrid
              state={state}
              picked={picked}
              highlight={highlight}
              onPick={togglePick}
              dimmed={locked}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <Button
                tone="gold"
                disabled={!takeReady || locked || Boolean(pending)}
                onClick={() => {
                  onMove({ kind: "take", cells: picked });
                  reset();
                }}
              >
                Take {picked.length > 0 ? `${picked.length} token${picked.length > 1 ? "s" : ""}` : "tokens"}
              </Button>
              <Button disabled={picked.length === 0} onClick={() => setPicked([])}>
                Clear
              </Button>
              <Button
                tone={spending ? "gold" : "plain"}
                disabled={!canSpendPrivilege(state, actor) || locked || Boolean(pending)}
                onClick={() => setSpending((on) => !on)}
                title="Free action: return a privilege for any token except gold"
              >
                {spending ? "Pick a token…" : "Spend privilege"}
              </Button>
              <Button
                disabled={!canReplenish(state, actor) || locked || Boolean(pending)}
                onClick={() => {
                  onMove({ kind: "replenish" });
                  reset();
                }}
                title="Free action: refill the board from the bag; your opponent gains a privilege"
                style={
                  mustReplenish(state, actor) && mine
                    ? { borderColor: C.accent, color: C.accent }
                    : undefined
                }
              >
                Replenish
              </Button>
            </div>
            <p style={{ margin: "8px 0 0", font: `500 11px/1.5 ${FONT.body}`, color: C.muted }}>
              Up to three tokens in one unbroken line — row, column or diagonal. Gold is only
              reachable by reserving a card.
            </p>
          </Panel>

          <PlayerCard state={state} player={rival} seat={seat} active={actor === rival} />
        </div>

        <div className="prism-column">
          <Market
            state={state}
            focused={focused}
            onFocus={(id) => setFocused((current) => (current === id ? null : id))}
            actor={actor}
          />
          {focused && (
            <CardActions
              state={state}
              id={focused}
              actor={actor}
              locked={locked || Boolean(pending)}
              onMove={(move) => {
                onMove(move);
                reset();
              }}
              onDismiss={() => setFocused(null)}
            />
          )}
          <Royals state={state} onResolve={onResolve} mine={mine} />
          <PlayerCard state={state} player={home} seat={seat} active={actor === home} />
        </div>
      </div>

      {showLog && (
        <Panel title="Move log">
          <ol
            className="prism-scroll"
            style={{
              margin: 0,
              padding: "0 0 0 18px",
              maxHeight: 200,
              overflowY: "auto",
              font: `500 12px/1.7 ${FONT.body}`,
              color: C.muted,
            }}
          >
            {logEntries(state).map((entry) => (
              <li key={entry.id}>{entry.text}</li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}

const logEntries = (state: GameState): Array<{ id: string; text: string }> =>
  state.log.map((text, index) => ({ id: `${state.log.length - index}-${text.slice(0, 12)}`, text }));

function Header({
  state,
  statusLine,
  onNewGame,
  onUndo,
  onToggleLog,
  showLog,
}: {
  state: GameState;
  statusLine: string;
  onNewGame: () => void;
  onUndo?: () => void;
  onToggleLog: () => void;
  showLog: boolean;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, font: `700 20px/1 ${FONT.display}`, letterSpacing: ".02em" }}>
          Prism Duel
        </h1>
        <span style={{ font: `600 13px/1.3 ${FONT.body}`, color: C.accent }}>{statusLine}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button tone="ghost" onClick={onToggleLog}>
          {showLog ? "Hide log" : "Log"}
        </Button>
        {onUndo && (
          <Button tone="ghost" onClick={onUndo} disabled={Boolean(state.winner)}>
            Undo
          </Button>
        )}
        <Button onClick={onNewGame}>New game</Button>
      </div>
    </header>
  );
}

function PrivilegeRow({ state }: { state: GameState }) {
  const held = [state.players[0].privileges, state.players[1].privileges];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginBottom: 10,
        padding: "6px 8px",
        borderRadius: 10,
        background: "rgba(0,0,0,.22)",
        boxShadow: SHADOW.sunk,
      }}
    >
      <span style={{ font: `600 10px/1 ${FONT.body}`, color: C.muted, letterSpacing: ".1em" }}>
        PRIVILEGES
      </span>
      {PRIVILEGE_SLOTS.map((slot) => {
        const owner = slot < held[0] ? 0 : slot < held[0] + held[1] ? 1 : null;
        const inSupply = slot >= held[0] + held[1];
        return (
          <span
            key={`privilege-${slot}`}
            title={inSupply ? "in the supply" : `held by ${state.names[owner as number]}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              background: inSupply ? "rgba(255,255,255,.1)" : G.accent,
              border: `1px solid ${inSupply ? C.line : "#8d6a22"}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              font: `700 10px/1 ${FONT.body}`,
              color: inSupply ? C.muted : "#2a1e05",
            }}
          >
            {inSupply ? "" : owner === 0 ? "1" : "2"}
          </span>
        );
      })}
    </div>
  );
}

function TokenGrid({
  state,
  picked,
  highlight,
  onPick,
  dimmed,
}: {
  state: GameState;
  picked: number[];
  highlight: Set<number> | null;
  onPick: (cell: number) => void;
  dimmed: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
        gap: 6,
        padding: 8,
        borderRadius: 12,
        background: "rgba(0,0,0,.3)",
        boxShadow: SHADOW.sunk,
        opacity: dimmed ? 0.72 : 1,
      }}
    >
      {CELLS.map((cell) => {
        const token = state.board[cell];
        const chosen = picked.includes(cell);
        const lit = highlight === null ? true : highlight.has(cell);
        if (token === null) {
          return (
            <div
              key={`cell-${cell}`}
              style={{
                aspectRatio: "1",
                borderRadius: "50%",
                border: `1px dashed ${C.line}`,
                background: "rgba(0,0,0,.25)",
              }}
            />
          );
        }
        const reachable = token !== "gold" && lit;
        return (
          <button
            key={`cell-${cell}`}
            type="button"
            disabled={!reachable}
            aria-label={`${TOKEN_LABEL[token]} at row ${Math.floor(cell / BOARD_SIZE) + 1} column ${(cell % BOARD_SIZE) + 1}`}
            onClick={() => onPick(cell)}
            className={chosen ? "prism-pulse" : undefined}
            style={{
              aspectRatio: "1",
              borderRadius: "50%",
              background: tokenFill(token),
              border: chosen
                ? `2px solid ${C.accent}`
                : `1px solid ${shade(TOKEN_COLOR[token], -40)}`,
              boxShadow: chosen ? SHADOW.cardUp : "0 2px 4px rgba(0,0,0,.45)",
              opacity: reachable ? 1 : 0.34,
              color: TOKEN_INK[token],
              font: `700 13px/1 ${FONT.body}`,
              padding: 0,
              cursor: reachable ? "pointer" : "default",
              transform: chosen ? "translateY(-2px)" : "none",
              transition: "transform .12s ease, opacity .15s ease",
            }}
          >
            {TOKEN_GLYPH[token]}
          </button>
        );
      })}
    </div>
  );
}

function Market({
  state,
  focused,
  onFocus,
  actor,
}: {
  state: GameState;
  focused: string | null;
  onFocus: (id: string) => void;
  actor: number;
}) {
  return (
    <Panel title="The market">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {([3, 2, 1] as const).map((tier) => (
          <div key={tier} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <CardBack count={state.decks[tier - 1].length} tier={tier} />
            <div
              className="prism-scroll"
              style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}
            >
              {slotsOf(state.market[tier - 1].length).map((slot) => {
                const id = state.market[tier - 1][slot];
                return id === null ? (
                  <EmptySlot key={`slot-${tier}-${slot}`} />
                ) : (
                  <CardFace
                    key={id}
                    id={id}
                    onClick={() => onFocus(id)}
                    selected={focused === id}
                    affordable={payment(state, actor, id) !== null}
                    label={describeCard(id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const describeCard = (id: string): string => {
  const entry = card(id);
  const costs = Object.entries(entry.cost)
    .map(([kind, amount]) => `${amount} ${TOKEN_LABEL[kind as TokenKind]}`)
    .join(", ");
  return `Tier ${entry.tier} ${entry.color ?? "neutral"} card, ${entry.points} points, ${entry.crowns} crowns, costs ${costs}`;
};

function CardActions({
  state,
  id,
  actor,
  locked,
  onMove,
  onDismiss,
}: {
  state: GameState;
  id: string;
  actor: number;
  locked: boolean;
  onMove: (move: Move) => void;
  onDismiss: () => void;
}) {
  const entry = card(id);
  const spend = payment(state, actor, id);
  const goldCell = state.board.indexOf("gold");
  return (
    <Panel style={{ animation: "prism-rise .18s ease-out both" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <CardFace id={id} />
        <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 8 }}>
          <strong style={{ font: `600 14px/1.2 ${FONT.display}` }}>
            Tier {entry.tier} · {entry.color ?? "neutral"}
          </strong>
          <span style={{ font: `500 12px/1.5 ${FONT.body}`, color: C.muted }}>
            {entry.points} prestige · {entry.crowns} crown{entry.crowns === 1 ? "" : "s"}
            {entry.bonus > 0 ? ` · +${entry.bonus} bonus` : ""}
            {entry.wildBonus ? " of a colour you choose" : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ font: `600 11px/1 ${FONT.body}`, color: C.muted }}>YOU PAY</span>
            {spend === null ? (
              <span style={{ font: `600 12px/1 ${FONT.body}`, color: C.danger }}>
                not affordable yet
              </span>
            ) : (
              SPENDABLE.concat("gold")
                .filter((kind) => spend[kind] > 0)
                .map((kind) => <TokenPip key={kind} kind={kind} size={22} count={spend[kind]} />)
            )}
            {spend !== null && SPENDABLE.concat("gold").every((kind) => spend[kind] === 0) && (
              <span style={{ font: `600 12px/1 ${FONT.body}`, color: C.good }}>nothing</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              tone="gold"
              disabled={locked || !canBuy(state, actor, id)}
              onClick={() => onMove({ kind: "buy", card: id })}
            >
              Buy
            </Button>
            <Button
              disabled={locked || !canReserve(state, actor, id) || goldCell < 0}
              onClick={() => onMove({ kind: "reserve", card: id, goldCell })}
              title={`Take 1 gold and hold this card (${state.players[actor].reserved.length}/${RESERVE_LIMIT} reserved)`}
            >
              Reserve + gold
            </Button>
            <Button tone="ghost" onClick={onDismiss}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Royals({
  state,
  onResolve,
  mine,
}: {
  state: GameState;
  onResolve: (choice: Resolution) => void;
  mine: boolean;
}) {
  const claiming = state.pending[0]?.type === "royal" && mine;
  return (
    <Panel title="Royal favours" right={<span style={{ font: `500 11px/1 ${FONT.body}`, color: C.muted }}>at 3 and 6 crowns</span>}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {slotsOf(state.royals.length).map((slot) => {
          const id = state.royals[slot];
          return id === null ? (
            <EmptySlot key={`royal-${slot}`} width={104} height={72} />
          ) : (
            <RoyalFace
              key={id}
              id={id}
              selectable={claiming}
              onClick={claiming ? () => onResolve({ kind: "royal", card: id }) : undefined}
            />
          );
        })}
      </div>
    </Panel>
  );
}

function PlayerCard({
  state,
  player,
  seat,
  active,
}: {
  state: GameState;
  player: number;
  seat: number | null;
  active?: boolean;
}) {
  const seen = view(state, player);
  const me = state.players[player];
  const leadColour = GEMS.reduce((best, gem) =>
    seen.colourPoints[gem] > seen.colourPoints[best] ? gem : best
  );
  const leadLabel = `${TOKEN_LABEL[leadColour]} prestige — a colour monopoly wins at ${COLOUR_POINTS_TO_WIN}`;
  return (
    <Panel
      title={`${state.names[player]}${seat === player ? " (you)" : ""}`}
      style={{
        borderColor: active ? C.accent : C.line,
        background: active ? G.panelLit : G.panel,
      }}
      right={
        <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
          <Stat label="pts" value={seen.points} highlight={seen.points >= 16} />
          <CrownMark count={seen.crowns} />
          <span
            title={leadLabel}
            style={{ display: "inline-flex", gap: 4, alignItems: "center", font: `700 13px/1 ${FONT.body}` }}
          >
            <TokenPip kind={leadColour} size={15} />
            {seen.colourPoints[leadColour]}
          </span>
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {SPENDABLE.concat("gold").map((kind) => (
            <TokenPip
              key={kind}
              kind={kind}
              size={24}
              count={me.tokens[kind]}
              faded={me.tokens[kind] === 0}
            />
          ))}
          <span
            style={{
              font: `600 11px/1 ${FONT.body}`,
              color: seen.tokenCount > TOKEN_LIMIT ? C.danger : C.muted,
            }}
          >
            {seen.tokenCount}/{TOKEN_LIMIT}
          </span>
          {me.privileges > 0 && (
            <span style={{ font: `600 11px/1 ${FONT.body}`, color: C.accent }}>
              {me.privileges} privilege{me.privileges > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {GEMS.map((gem) => (
            <span
              key={gem}
              title={`${seen.bonuses[gem]} ${TOKEN_LABEL[gem]} bonus, ${seen.colourPoints[gem]} points`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 7px",
                borderRadius: 7,
                background: "rgba(0,0,0,.25)",
                border: `1px solid ${seen.colourPoints[gem] >= 8 ? C.accent : C.line}`,
                font: `600 11px/1 ${FONT.body}`,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: tokenFill(gem),
                  display: "inline-block",
                }}
              />
              {seen.bonuses[gem]}
              <span style={{ color: C.muted }}>/{seen.colourPoints[gem]}p</span>
            </span>
          ))}
        </div>
        {me.reserved.length > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ font: `600 10px/1 ${FONT.body}`, color: C.muted, letterSpacing: ".1em" }}>
              RESERVED
            </span>
            {me.reserved.map((id) => (
              <CardFace key={id} id={id} compact />
            ))}
          </div>
        )}
        {(me.cards.length > 0 || me.royals.length > 0) && (
          <div
            className="prism-scroll"
            style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4, alignItems: "flex-start" }}
          >
            {tableauOrder(me).map((id) => (
              <CardFace key={id} id={id} compact chosen={me.wildChoice[id]} />
            ))}
            {me.royals.map((id) => (
              <span
                key={id}
                style={{
                  padding: "4px 7px",
                  borderRadius: 7,
                  background: G.accent,
                  color: "#2a1e05",
                  font: `700 10px/1.3 ${FONT.body}`,
                  alignSelf: "flex-start",
                  whiteSpace: "nowrap",
                }}
              >
                {royal(id).name} · {royal(id).points}
              </span>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

const tableauOrder = (player: GameState["players"][number]): string[] => {
  const rank = (id: string): number => {
    const entry = card(id);
    const colour = entry.wildBonus ? player.wildChoice[id] : entry.color;
    const at = colour ? GEMS.indexOf(colour) : GEMS.length;
    return at * 10 + entry.tier;
  };
  return [...player.cards].sort((left, right) => rank(left) - rank(right));
};

const Stat = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) => (
  <span
    style={{
      font: `700 13px/1 ${FONT.body}`,
      color: highlight ? C.accent : C.ink,
      display: "inline-flex",
      gap: 3,
      alignItems: "baseline",
    }}
  >
    {value}
    <span style={{ font: `600 9px/1 ${FONT.body}`, color: C.muted, letterSpacing: ".08em" }}>
      {label.toUpperCase()}
    </span>
  </span>
);

function Prompt({
  state,
  onResolve,
}: {
  state: GameState;
  onResolve: (choice: Resolution) => void;
}) {
  const pending = state.pending[0];
  const banner: CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    padding: "10px 14px",
    borderRadius: 12,
    background: "linear-gradient(90deg, rgba(216,169,74,.16) 0%, rgba(216,169,74,.05) 100%)",
    border: `1px solid ${C.accent}`,
    font: `600 13px/1.4 ${FONT.body}`,
  };
  if (pending.type === "wild") {
    return (
      <div className="prism-rise" style={banner}>
        <span>Choose the colour this neutral card counts as:</span>
        {GEMS.map((gem) => (
          <Button key={gem} onClick={() => onResolve({ kind: "wild", color: gem })}>
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              <TokenPip kind={gem} size={16} />
              {TOKEN_LABEL[gem]}
            </span>
          </Button>
        ))}
      </div>
    );
  }
  if (pending.type === "steal") {
    const victim = state.players[1 - pending.player];
    return (
      <div className="prism-rise" style={banner}>
        <span>Take one token from {state.names[1 - pending.player]}:</span>
        {SPENDABLE.filter((kind) => victim.tokens[kind] > 0).map((kind) => (
          <Button key={kind} onClick={() => onResolve({ kind: "steal", token: kind })}>
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              <TokenPip kind={kind} size={16} />
              {victim.tokens[kind]}
            </span>
          </Button>
        ))}
      </div>
    );
  }
  if (pending.type === "discard") {
    const me = state.players[pending.player];
    return (
      <div className="prism-rise" style={banner}>
        <span>
          Over the {TOKEN_LIMIT}-token limit — return {pending.count} to the bag:
        </span>
        {SPENDABLE.concat("gold")
          .filter((kind) => me.tokens[kind] > 0)
          .map((kind) => (
            <Button key={kind} onClick={() => onResolve({ kind: "discard", token: kind })}>
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <TokenPip kind={kind} size={16} />
                {me.tokens[kind]}
              </span>
            </Button>
          ))}
      </div>
    );
  }
  if (pending.type === "royal") {
    return (
      <div className="prism-rise" style={banner}>
        <span>Crown threshold reached — claim a royal favour below.</span>
      </div>
    );
  }
  return (
    <div className="prism-rise" style={banner}>
      <span>
        {pending.color
          ? `Claim 1 ${TOKEN_LABEL[pending.color]} from the board.`
          : "Claim any one token from the board."}
      </span>
    </div>
  );
}

function Verdict({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const winner = state.winner;
  if (!winner) return null;
  const reasons: Record<string, string> = {
    points: `${POINTS_LABEL} prestige`,
    colour: "a colour monopoly",
    crowns: "ten crowns",
    stalemate: "the stalemate rule",
  };
  return (
    <div
      className="prism-rise"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
        padding: "12px 16px",
        borderRadius: 12,
        background: G.accent,
        color: "#2a1e05",
        font: `700 15px/1.3 ${FONT.display}`,
      }}
    >
      <span>
        {winner.player === null
          ? "A draw — neither duellist could break the deadlock."
          : `${state.names[winner.player]} wins on ${reasons[winner.by]}.`}
      </span>
      <Button onClick={onNewGame} style={{ background: "#2a1e05", color: "#f6e6c2", border: "none" }}>
        Play again
      </Button>
    </div>
  );
}

const POINTS_LABEL = "twenty";
