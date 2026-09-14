import { useCallback, useEffect, useRef, useState } from "react";
import { applyMove, applyResolution, newGame } from "./engine.ts";
import type { GameState, Move, Resolution } from "./engine.ts";
import { chooseMove, chooseResolution } from "./bot.ts";
import { answerDirect, hostRoom, joinRoom, offerDirect, stateFrame } from "./net.ts";
import type { DirectSide, Handlers, Link } from "./net.ts";
import { Setup } from "./Setup.tsx";
import type { StartRequest } from "./Setup.tsx";
import { TableView } from "./TableView.tsx";

type Mode = "solo" | "local" | "online";

const BOT_DELAY = 620;

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [directBlob, setDirectBlob] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);

  const linkRef = useRef<Link | null>(null);
  const directRef = useRef<DirectSide | null>(null);
  const teardownRef = useRef<(() => void) | null>(null);
  const pendingNameRef = useRef("Lapidary");
  const stateRef = useRef<GameState | null>(null);

  stateRef.current = state;

  const publish = useCallback((next: GameState) => {
    setState(next);
    const link = linkRef.current;
    if (link?.isOpen()) link.send(stateFrame(next));
  }, []);

  const commit = useCallback(
    (next: GameState) => {
      const current = stateRef.current;
      if (current && next !== current) setHistory((past) => [...past.slice(-40), current]);
      publish(next);
    },
    [publish]
  );

  const handlers = useCallback(
    (role: "host" | "guest"): Handlers => ({
      onState: (incoming) => setState(incoming),
      onOpen: (link) => {
        linkRef.current = link;
        setConnected(true);
        setStatus(null);
        setError(null);
        if (role !== "host") return;
        const opening = newGame([pendingNameRef.current, "Challenger"], Date.now());
        setState(opening);
        link.send(stateFrame(opening));
      },
      onClose: () => {
        setConnected(false);
        setError("The connection dropped. The board is frozen where it stood.");
      },
      onError: (message) => {
        setBusy(false);
        setError(message);
      },
    }),
    []
  );

  const start = useCallback(
    async (request: StartRequest) => {
      setError(null);
      if (request.kind === "local") {
        pendingNameRef.current = request.names[0] || "Lapidary";
        setMode("local");
        setSeat(null);
        setHistory([]);
        setState(newGame(request.names, Date.now()));
        return;
      }
      pendingNameRef.current = request.name || "Lapidary";
      if (request.kind === "solo") {
        setMode("solo");
        setSeat(0);
        setHistory([]);
        setState(newGame([request.name || "You", "The Engine"], Date.now()));
        return;
      }
      setBusy(true);
      try {
        if (request.kind === "host") {
          setMode("online");
          setSeat(0);
          setStatus("Opening a table…");
          teardownRef.current = await hostRoom(handlers("host"), (code) => {
            setRoomCode(code);
            setStatus("Waiting for an opponent to join…");
          });
        } else if (request.kind === "join") {
          setMode("online");
          setSeat(1);
          setStatus("Knocking on that table…");
          teardownRef.current = await joinRoom(request.code, handlers("guest"));
        } else if (request.kind === "offer") {
          setMode("online");
          setSeat(0);
          setStatus("Gathering network routes…");
          const side = await offerDirect(handlers("host"));
          directRef.current = side;
          teardownRef.current = side.close;
          setDirectBlob(side.blob);
          setStatus("Send the invitation, then paste their reply.");
        } else {
          setMode("online");
          setSeat(1);
          setStatus("Gathering network routes…");
          const side = await answerDirect(request.offer, handlers("guest"));
          directRef.current = side;
          teardownRef.current = side.close;
          setDirectBlob(side.blob);
          setStatus("Send this reply back to the host and wait.");
        }
      } catch (caught) {
        setError((caught as Error).message);
        setMode(null);
      } finally {
        setBusy(false);
      }
    },
    [handlers]
  );

  const acceptAnswer = useCallback((answer: string) => {
    const side = directRef.current;
    if (!side) return;
    side.accept(answer).catch(() => setError("That reply could not be read. Check the paste."));
    setStatus("Answer accepted — waiting for the channel to open.");
  }, []);

  const reset = useCallback(() => {
    teardownRef.current?.();
    teardownRef.current = null;
    linkRef.current = null;
    directRef.current = null;
    setState(null);
    setMode(null);
    setSeat(null);
    setHistory([]);
    setRoomCode(null);
    setDirectBlob(null);
    setStatus(null);
    setError(null);
    setConnected(false);
  }, []);

  const newRound = useCallback(() => {
    if (mode === "online") {
      if (seat !== 0) {
        setError("Only the player who opened the table can deal a new game.");
        return;
      }
      const current = stateRef.current;
      const names = current ? current.names : ["Host", "Challenger"];
      setHistory([]);
      publish(newGame([names[0], names[1]], Date.now()));
      return;
    }
    reset();
  }, [mode, publish, reset, seat]);

  useEffect(() => {
    if (mode !== "solo" || !state || state.winner) return;
    const actor = state.pending.length > 0 ? state.pending[0].player : state.turn;
    if (actor !== 1) return;
    const timer = setTimeout(() => {
      const current = stateRef.current;
      if (!current || current.winner) return;
      const next =
        current.pending.length > 0
          ? applyResolution(current, chooseResolution(current))
          : applyMove(current, chooseMove(current, 1));
      if (next !== current) setState(next);
    }, BOT_DELAY);
    return () => clearTimeout(timer);
  }, [mode, state]);

  useEffect(() => () => teardownRef.current?.(), []);

  if (!state || mode === null) {
    return (
      <Setup
        onStart={start}
        roomCode={roomCode}
        directBlob={directBlob}
        onAcceptAnswer={acceptAnswer}
        status={status}
        error={error}
        busy={busy}
      />
    );
  }

  return (
    <TableView
      state={state}
      seat={mode === "local" ? null : seat}
      onMove={(move: Move) => commit(applyMove(state, move))}
      onResolve={(choice: Resolution) => commit(applyResolution(state, choice))}
      onUndo={
        mode === "online" || history.length === 0
          ? undefined
          : () => {
              const past = history[history.length - 1];
              setHistory((rest) => rest.slice(0, -1));
              setState(past);
            }
      }
      onNewGame={newRound}
      statusLine={statusLine(state, mode, seat, connected, error)}
    />
  );
}

function statusLine(
  state: GameState,
  mode: Mode,
  seat: number | null,
  connected: boolean,
  error: string | null
): string {
  if (error && mode === "online") return error;
  if (mode === "online" && !connected) return "Waiting for the other browser…";
  if (state.winner) {
    return state.winner.player === null ? "A draw" : `${state.names[state.winner.player]} wins`;
  }
  const actor = state.pending.length > 0 ? state.pending[0].player : state.turn;
  if (mode === "local") return `${state.names[actor]} to act`;
  if (seat === actor) return "Your move";
  return `${state.names[actor]} is thinking…`;
}
