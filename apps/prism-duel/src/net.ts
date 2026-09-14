import type { GameState } from "./engine.ts";

export type Role = "host" | "guest";

export interface Link {
  send: (message: unknown) => void;
  isOpen: () => boolean;
  role: Role;
  close: () => void;
}

export interface Handlers {
  onState: (state: GameState) => void;
  onOpen: (link: Link) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

interface PeerDataConnection {
  open: boolean;
  send: (data: unknown) => void;
  close: () => void;
  on: (event: string, callback: (arg: unknown) => void) => void;
}

interface PeerInstance {
  connect: (id: string, options?: { reliable?: boolean }) => PeerDataConnection;
  on: (event: string, callback: (arg: unknown) => void) => void;
  close: () => void;
}

interface PeerConstructor {
  new (id: string, options?: Record<string, unknown>): PeerInstance;
  new (options?: Record<string, unknown>): PeerInstance;
}

const peerFromWindow = (): PeerConstructor | undefined =>
  (window as unknown as { Peer?: PeerConstructor }).Peer;

const errorKind = (error: unknown): string =>
  (error as { type?: string } | null)?.type ?? "unknown";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const PEER_CDN = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
const ROOM_PREFIX = "prism-duel-";
const BROKER_TIMEOUT = 8000;

let peerLibrary: PeerConstructor | undefined;

function loadPeer(): Promise<PeerConstructor> {
  if (peerLibrary) return Promise.resolve(peerLibrary);
  const existing = peerFromWindow();
  if (existing) {
    peerLibrary = existing;
    return Promise.resolve(peerLibrary);
  }
  return new Promise<PeerConstructor>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = PEER_CDN;
    tag.onload = () => {
      const loaded = peerFromWindow();
      if (!loaded) {
        reject(new Error("the connection library did not load"));
        return;
      }
      peerLibrary = loaded;
      resolve(loaded);
    };
    tag.onerror = () => reject(new Error("the connection library is blocked on this network"));
    document.head.appendChild(tag);
    setTimeout(() => reject(new Error("the connection library timed out")), BROKER_TIMEOUT);
  });
}

export const newRoomCode = (): string => Math.random().toString(36).slice(2, 7).toUpperCase();

const wrapPeer = (connection: PeerDataConnection, role: Role): Link => ({
  send: (message) => connection.send(message),
  isOpen: () => connection.open,
  role,
  close: () => connection.close(),
});

function bindPeer(connection: PeerDataConnection, role: Role, handlers: Handlers): void {
  connection.on("data", (message) => {
    const frame = message as { kind?: string; state?: GameState } | null;
    if (frame && frame.kind === "state" && frame.state) handlers.onState(frame.state);
  });
  connection.on("open", () => handlers.onOpen(wrapPeer(connection, role)));
  connection.on("close", handlers.onClose);
  connection.on("error", handlers.onClose);
}

export async function hostRoom(
  handlers: Handlers,
  onReady: (code: string) => void
): Promise<() => void> {
  const Peer = await loadPeer();
  const code = newRoomCode();
  const peer = new Peer(ROOM_PREFIX + code, { config: ICE });
  peer.on("open", () => onReady(code));
  peer.on("connection", (connection) =>
    bindPeer(connection as PeerDataConnection, "host", handlers)
  );
  peer.on("error", (error) => {
    const kind = errorKind(error);
    handlers.onError(
      kind === "unavailable-id"
        ? "That room code was already in use. Try opening another table."
        : `Connection problem: ${kind}`
    );
  });
  return () => peer.close();
}

export async function joinRoom(code: string, handlers: Handlers): Promise<() => void> {
  const Peer = await loadPeer();
  const peer = new Peer({ config: ICE });
  await new Promise<void>((resolve, reject) => {
    peer.on("open", () => resolve());
    peer.on("error", (error) => reject(error));
    setTimeout(() => reject(new Error("the matchmaking broker did not answer")), BROKER_TIMEOUT);
  });
  bindPeer(peer.connect(ROOM_PREFIX + code.trim().toUpperCase(), { reliable: true }), "guest", handlers);
  peer.on("error", (error) => {
    const kind = errorKind(error);
    handlers.onError(
      kind === "peer-unavailable"
        ? "No table found with that code. Check it, and that the host still has their tab open."
        : `Connection problem: ${kind}`
    );
  });
  return () => peer.close();
}

const packDescriptor = (descriptor: RTCSessionDescriptionInit): string =>
  btoa(JSON.stringify({ type: descriptor.type, sdp: descriptor.sdp }));

const unpackDescriptor = (text: string): RTCSessionDescriptionInit =>
  JSON.parse(atob(text.replace(/\s/g, "")));

function iceSettled(connection: RTCPeerConnection): Promise<void> {
  return new Promise<void>((done) => {
    if (connection.iceGatheringState === "complete") {
      done();
      return;
    }
    const check = () => {
      if (connection.iceGatheringState !== "complete") return;
      connection.removeEventListener("icegatheringstatechange", check);
      done();
    };
    connection.addEventListener("icegatheringstatechange", check);
    setTimeout(done, 5000);
  });
}

function bindChannel(channel: RTCDataChannel, role: Role, handlers: Handlers): void {
  const link: Link = {
    send: (message) => channel.send(JSON.stringify(message)),
    isOpen: () => channel.readyState === "open",
    role,
    close: () => channel.close(),
  };
  channel.onmessage = (event) => {
    try {
      const frame = JSON.parse(event.data) as { kind?: string; state?: GameState };
      if (frame.kind === "state" && frame.state) handlers.onState(frame.state);
    } catch {
      handlers.onError("A malformed message arrived and was ignored.");
    }
  };
  channel.onopen = () => handlers.onOpen(link);
  channel.onclose = handlers.onClose;
  channel.onerror = handlers.onClose;
  if (channel.readyState === "open") handlers.onOpen(link);
}

export interface DirectSide {
  blob: string;
  close: () => void;
  accept: (answer: string) => Promise<void>;
}

export async function offerDirect(handlers: Handlers): Promise<DirectSide> {
  const connection = new RTCPeerConnection(ICE);
  bindChannel(connection.createDataChannel("prism-duel", { ordered: true }), "host", handlers);
  await connection.setLocalDescription(await connection.createOffer());
  await iceSettled(connection);
  return {
    blob: packDescriptor(connection.localDescription as RTCSessionDescription),
    close: () => connection.close(),
    accept: async (answer: string) => {
      await connection.setRemoteDescription(unpackDescriptor(answer));
    },
  };
}

export async function answerDirect(offer: string, handlers: Handlers): Promise<DirectSide> {
  const connection = new RTCPeerConnection(ICE);
  connection.ondatachannel = (event) => bindChannel(event.channel, "guest", handlers);
  await connection.setRemoteDescription(unpackDescriptor(offer));
  await connection.setLocalDescription(await connection.createAnswer());
  await iceSettled(connection);
  return {
    blob: packDescriptor(connection.localDescription as RTCSessionDescription),
    close: () => connection.close(),
    accept: async () => undefined,
  };
}

export const stateFrame = (state: GameState) => ({ kind: "state", state });
