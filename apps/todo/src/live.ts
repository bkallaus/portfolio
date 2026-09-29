import { isTodoList, type TodoList } from "./model.ts";

export type LiveStatus = "connecting" | "hosting" | "joined" | "retrying";

export type LiveHandlers = {
  current: () => TodoList;
  onList: (list: TodoList) => void;
  onStatus: (status: LiveStatus, peers: number) => void;
};

export type LiveSession = {
  broadcast: (list: TodoList) => void;
  stop: () => void;
};

interface PeerDataConnection {
  open: boolean;
  send: (data: unknown) => void;
  close: () => void;
  on: (event: string, callback: (arg: unknown) => void) => void;
}

interface PeerInstance {
  connect: (id: string, options?: { reliable?: boolean }) => PeerDataConnection;
  on: (event: string, callback: (arg: unknown) => void) => void;
  destroy: () => void;
}

interface PeerConstructor {
  new (id: string, options?: Record<string, unknown>): PeerInstance;
  new (options?: Record<string, unknown>): PeerInstance;
}

const PEER_CDN = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
const ROOM_PREFIX = "bk-shared-todo-";
const LOAD_TIMEOUT = 8000;
const ICE: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const peerFromWindow = (): PeerConstructor | undefined =>
  (window as unknown as { Peer?: PeerConstructor }).Peer;

let loading: Promise<PeerConstructor> | undefined;

function loadPeer(): Promise<PeerConstructor> {
  const existing = peerFromWindow();
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise<PeerConstructor>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = PEER_CDN;
    tag.onload = () => {
      const loaded = peerFromWindow();
      if (loaded) resolve(loaded);
      else reject(new Error("the sync library did not load"));
    };
    tag.onerror = () => reject(new Error("the sync library is blocked on this network"));
    document.head.appendChild(tag);
    setTimeout(() => reject(new Error("the sync library timed out")), LOAD_TIMEOUT);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

const errorKind = (error: unknown): string => (error as { type?: string } | null)?.type ?? "unknown";

const listFrame = (list: TodoList) => ({ kind: "list", list });

function listFrom(message: unknown): TodoList | null {
  const frame = message as { kind?: string; list?: unknown } | null;
  return frame?.kind === "list" && isTodoList(frame.list) ? frame.list : null;
}

export function goLive(listId: string, handlers: LiveHandlers): LiveSession {
  let stopped = false;
  let peer: PeerInstance | undefined;
  let links: PeerDataConnection[] = [];
  let role: "host" | "guest" | undefined;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const openLinks = () => links.filter((link) => link.open);
  const report = () => {
    if (role) handlers.onStatus(role === "host" ? "hosting" : "joined", openLinks().length);
  };

  const teardown = () => {
    for (const link of links) link.close();
    links = [];
    role = undefined;
    peer?.destroy();
    peer = undefined;
  };

  const retry = () => {
    if (stopped) return;
    teardown();
    handlers.onStatus("retrying", 0);
    attempt += 1;
    const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 30_000) * (0.5 + Math.random());
    clearTimeout(retryTimer);
    retryTimer = setTimeout(start, delay);
  };

  const adopt = (link: PeerDataConnection) => {
    links.push(link);
    link.on("open", () => {
      attempt = 0;
      link.send(listFrame(handlers.current()));
      report();
    });
    link.on("data", (message) => {
      const list = listFrom(message);
      if (list && list.id === listId) handlers.onList(list);
    });
    const drop = () => {
      links = links.filter((other) => other !== link);
      if (role === "guest") retry();
      else report();
    };
    link.on("close", drop);
    link.on("error", drop);
  };

  const joinAsGuest = (Peer: PeerConstructor) => {
    const guest = new Peer({ config: ICE });
    peer = guest;
    guest.on("open", () => {
      if (stopped || peer !== guest) return;
      role = "guest";
      adopt(guest.connect(ROOM_PREFIX + listId, { reliable: true }));
    });
    guest.on("error", () => {
      if (peer === guest) retry();
    });
  };

  const start = async () => {
    if (stopped) return;
    handlers.onStatus("connecting", 0);
    let Peer: PeerConstructor;
    try {
      Peer = await loadPeer();
    } catch {
      retry();
      return;
    }
    if (stopped) return;
    const host = new Peer(ROOM_PREFIX + listId, { config: ICE });
    peer = host;
    host.on("open", () => {
      if (stopped || peer !== host) return;
      role = "host";
      attempt = 0;
      report();
    });
    host.on("connection", (link) => adopt(link as PeerDataConnection));
    host.on("error", (error) => {
      if (peer !== host) return;
      if (errorKind(error) === "unavailable-id") {
        host.destroy();
        joinAsGuest(Peer);
      } else retry();
    });
  };

  start();

  return {
    broadcast: (list) => {
      for (const link of openLinks()) link.send(listFrame(list));
    },
    stop: () => {
      stopped = true;
      clearTimeout(retryTimer);
      teardown();
    },
  };
}
