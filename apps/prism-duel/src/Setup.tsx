import { useState } from "react";
import { C, FONT, G, SHADOW } from "./theme.ts";
import { Button, Panel } from "./ui.tsx";
import { RulesSheet } from "./RulesSheet.tsx";

export type StartRequest =
  | { kind: "solo"; name: string }
  | { kind: "local"; names: [string, string] }
  | { kind: "host"; name: string }
  | { kind: "join"; name: string; code: string }
  | { kind: "offer"; name: string }
  | { kind: "answer"; name: string; offer: string };

export interface SetupProps {
  onStart: (request: StartRequest) => void;
  roomCode: string | null;
  directBlob: string | null;
  onAcceptAnswer: (answer: string) => void;
  status: string | null;
  error: string | null;
  busy: boolean;
}

type Lane = "solo" | "local" | "online" | "direct";

export function Setup({
  onStart,
  roomCode,
  directBlob,
  onAcceptAnswer,
  status,
  error,
  busy,
}: SetupProps) {
  const [lane, setLane] = useState<Lane>("solo");
  const [name, setName] = useState("Lapidary");
  const [rival, setRival] = useState("Rival");
  const [code, setCode] = useState("");
  const [offer, setOffer] = useState("");
  const [answer, setAnswer] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: G.table,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        padding: "clamp(24px, 7vh, 72px) 16px 56px",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              font: `600 11px/1 ${FONT.body}`,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: C.accent,
            }}
          >
            An original two-player gem duel
          </span>
          <h1 style={{ margin: 0, font: `700 clamp(32px, 7vw, 48px)/1 ${FONT.display}` }}>
            Prism Duel
          </h1>
          <p style={{ margin: 0, font: `400 15px/1.6 ${FONT.body}`, color: C.muted, maxWidth: 520 }}>
            Draw gems from a five-by-five board in straight lines, spend them on cards that discount
            the next purchase, and race to twenty prestige, ten crowns, or a monopoly on one colour.
            Play the engine, share a device, or send a room code to a friend.
          </p>
        </header>

        <Panel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {(
              [
                ["solo", "Versus the engine"],
                ["local", "Share this device"],
                ["online", "Room code"],
                ["direct", "Direct link"],
              ] as Array<[Lane, string]>
            ).map(([value, label]) => (
              <Button
                key={value}
                tone={lane === value ? "gold" : "plain"}
                onClick={() => setLane(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Your name" value={name} onChange={setName} />

            {lane === "local" && <Field label="Opponent" value={rival} onChange={setRival} />}

            {lane === "online" && (
              <>
                {roomCode ? (
                  <Notice tone="accent">
                    Your table is open. Send this code to your opponent:{" "}
                    <strong style={{ font: `700 20px/1 ${FONT.mono}`, letterSpacing: ".16em" }}>
                      {roomCode}
                    </strong>
                  </Notice>
                ) : (
                  <Button tone="gold" disabled={busy} onClick={() => onStart({ kind: "host", name })}>
                    Open a table
                  </Button>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <Field
                    label="Or join with a code"
                    value={code}
                    onChange={(next) => setCode(next.toUpperCase())}
                    placeholder="ABCDE"
                    mono
                  />
                  <Button
                    disabled={busy || code.trim().length < 4}
                    onClick={() => onStart({ kind: "join", name, code })}
                  >
                    Join
                  </Button>
                </div>
                <p style={{ margin: 0, font: `400 12px/1.6 ${FONT.body}`, color: C.muted }}>
                  A public broker introduces the two browsers, then drops out — the game itself runs
                  peer to peer. Nothing is stored on a server.
                </p>
              </>
            )}

            {lane === "direct" && (
              <>
                <p style={{ margin: 0, font: `400 12px/1.6 ${FONT.body}`, color: C.muted }}>
                  No third party at all. One side creates an invitation, the other answers it, and you
                  carry the two strings across by any chat you already trust.
                </p>
                {directBlob ? (
                  <>
                    <Blob label="Send this invitation" value={directBlob} />
                    <Field
                      label="Paste the reply here"
                      value={answer}
                      onChange={setAnswer}
                      placeholder="Their answer string"
                    />
                    <Button
                      tone="gold"
                      disabled={answer.trim().length < 20}
                      onClick={() => onAcceptAnswer(answer)}
                    >
                      Connect
                    </Button>
                  </>
                ) : (
                  <>
                    <Button tone="gold" disabled={busy} onClick={() => onStart({ kind: "offer", name })}>
                      Create an invitation
                    </Button>
                    <Field
                      label="Or answer one"
                      value={offer}
                      onChange={setOffer}
                      placeholder="Paste their invitation"
                    />
                    <Button
                      disabled={busy || offer.trim().length < 20}
                      onClick={() => onStart({ kind: "answer", name, offer })}
                    >
                      Answer it
                    </Button>
                  </>
                )}
              </>
            )}

            {(lane === "solo" || lane === "local") && (
              <Button
                tone="gold"
                onClick={() =>
                  lane === "solo"
                    ? onStart({ kind: "solo", name })
                    : onStart({ kind: "local", names: [name, rival] })
                }
              >
                {lane === "solo" ? "Start the duel" : "Start a shared game"}
              </Button>
            )}

            {status && <Notice tone="plain">{status}</Notice>}
            {error && <Notice tone="danger">{error}</Notice>}
          </div>
        </Panel>

        <Panel
          title="How it plays"
          right={
            <Button tone="ghost" onClick={() => setRulesOpen((open) => !open)}>
              {rulesOpen ? "Hide" : "Full rules"}
            </Button>
          }
        >
          {rulesOpen ? (
            <RulesSheet />
          ) : (
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                font: `400 13px/1.8 ${FONT.body}`,
                color: C.muted,
              }}
            >
              <li>Take up to three tokens in one unbroken line — row, column or diagonal.</li>
              <li>Or take a gold token and reserve a card for later.</li>
              <li>Or buy a card; your bonuses discount every future purchase.</li>
              <li>Win on 20 prestige, 10 crowns, or 10 prestige in a single colour.</li>
            </ul>
          )}
        </Panel>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 180px" }}>
      <span
        style={{
          font: `600 10px/1 ${FONT.body}`,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{
          padding: "9px 11px",
          borderRadius: 9,
          border: `1px solid ${C.line}`,
          background: "rgba(0,0,0,.3)",
          color: C.ink,
          font: `500 14px/1.2 ${mono ? FONT.mono : FONT.body}`,
          letterSpacing: mono ? ".14em" : undefined,
          boxShadow: SHADOW.sunk,
        }}
      />
    </label>
  );
}

function Blob({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          font: `600 10px/1 ${FONT.body}`,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {label}
      </span>
      <textarea
        readOnly
        value={value}
        rows={3}
        style={{
          padding: 10,
          borderRadius: 9,
          border: `1px solid ${C.line}`,
          background: "rgba(0,0,0,.3)",
          color: C.muted,
          font: `400 11px/1.45 ${FONT.mono}`,
          resize: "vertical",
        }}
      />
      <Button
        onClick={() => {
          navigator.clipboard?.writeText(value).then(
            () => setCopied(true),
            () => setCopied(false)
          );
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function Notice({ tone, children }: { tone: "plain" | "accent" | "danger"; children: React.ReactNode }) {
  const tones = {
    plain: { border: C.line, color: C.muted, background: "rgba(255,255,255,.04)" },
    accent: { border: C.accent, color: C.ink, background: "rgba(216,169,74,.12)" },
    danger: { border: C.danger, color: "#f2c7c3", background: "rgba(201,85,76,.12)" },
  }[tone];
  return (
    <p
      style={{
        margin: 0,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${tones.border}`,
        background: tones.background,
        color: tones.color,
        font: `500 13px/1.6 ${FONT.body}`,
      }}
    >
      {children}
    </p>
  );
}
