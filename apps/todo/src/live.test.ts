import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { goLive, type LiveStatus } from "./live.ts";
import { addTodo, emptyList, type TodoList } from "./model.ts";

type Callback = (arg: unknown) => void;

class Emitter {
  private listeners = new Map<string, Callback[]>();
  on(event: string, callback: Callback) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), callback]);
  }
  emit(event: string, arg?: unknown) {
    for (const callback of this.listeners.get(event) ?? []) callback(arg);
  }
}

const registry = new Map<string, FakePeer>();
let anonymous = 0;

class FakeConnection extends Emitter {
  open = false;
  other?: FakeConnection;
  send(data: unknown) {
    const target = this.other;
    if (this.open && target) setTimeout(() => target.emit("data", structuredClone(data)), 0);
  }
  close() {
    for (const side of [this, this.other]) {
      if (side?.open) {
        side.open = false;
        setTimeout(() => side.emit("close"), 0);
      }
    }
  }
}

class FakePeer extends Emitter {
  connections: FakeConnection[] = [];
  constructor(
    public id: string | Record<string, unknown> = `anon-${anonymous++}`,
    _options?: Record<string, unknown>
  ) {
    super();
    const name = typeof id === "string" ? id : `anon-${anonymous++}`;
    this.id = name;
    setTimeout(() => {
      if (registry.has(name)) this.emit("error", { type: "unavailable-id" });
      else {
        registry.set(name, this);
        this.emit("open", name);
      }
    }, 0);
  }
  connect(id: string) {
    const mine = new FakeConnection();
    setTimeout(() => {
      const target = registry.get(id);
      if (!target) {
        this.emit("error", { type: "peer-unavailable" });
        return;
      }
      const theirs = new FakeConnection();
      mine.other = theirs;
      theirs.other = mine;
      this.connections.push(mine);
      target.connections.push(theirs);
      target.emit("connection", theirs);
      mine.open = theirs.open = true;
      mine.emit("open");
      theirs.emit("open");
    }, 0);
    return mine;
  }
  destroy() {
    for (const connection of this.connections) connection.close();
    if (registry.get(this.id as string) === this) registry.delete(this.id as string);
  }
}

function device(list: TodoList) {
  const state = { list, status: "connecting" as LiveStatus, peers: 0 };
  const session = goLive(list.id, {
    current: () => state.list,
    onList: (incoming) => {
      const merged = { ...state.list, todos: { ...state.list.todos, ...incoming.todos } };
      state.list = merged;
    },
    onStatus: (status, peers) => {
      state.status = status;
      state.peers = peers;
    },
  });
  return { state, session };
}

describe("goLive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    registry.clear();
    Object.assign(window, { Peer: FakePeer });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("elects a host, relays lists both ways, and re-elects when the host leaves", async () => {
    const list = emptyList("room1234", "Shared", 1);
    const alice = device(addTodo(list, { title: "From Alice" }, 1, "a"));
    await vi.advanceTimersByTimeAsync(10);
    expect(alice.state.status).toBe("hosting");

    const bob = device(addTodo(list, { title: "From Bob" }, 1, "b"));
    await vi.advanceTimersByTimeAsync(10);
    expect(bob.state).toMatchObject({ status: "joined", peers: 1 });
    expect(alice.state).toMatchObject({ status: "hosting", peers: 1 });
    expect(Object.keys(alice.state.list.todos).sort()).toEqual(["a", "b"]);
    expect(Object.keys(bob.state.list.todos).sort()).toEqual(["a", "b"]);

    alice.session.broadcast(addTodo(alice.state.list, { title: "Later" }, 2, "c"));
    await vi.advanceTimersByTimeAsync(10);
    expect(bob.state.list.todos.c?.title).toBe("Later");

    alice.session.stop();
    await vi.advanceTimersByTimeAsync(10);
    expect(bob.state.status).toBe("retrying");
    await vi.advanceTimersByTimeAsync(5000);
    expect(bob.state.status).toBe("hosting");

    const carol = device(list);
    await vi.advanceTimersByTimeAsync(10);
    expect(carol.state.status).toBe("joined");
    expect(Object.keys(carol.state.list.todos).sort()).toEqual(["a", "b", "c"]);
    bob.session.stop();
    carol.session.stop();
  });

  it("ignores frames for another list", async () => {
    const alice = device(emptyList("room1234", "Shared", 1));
    await vi.advanceTimersByTimeAsync(10);
    const stranger = device(addTodo(emptyList("room1234", "Shared", 1), { title: "x" }, 1, "x"));
    await vi.advanceTimersByTimeAsync(10);
    stranger.session.broadcast(addTodo(emptyList("other999", "Other", 1), { title: "y" }, 1, "y"));
    await vi.advanceTimersByTimeAsync(10);
    expect(alice.state.list.todos.y).toBeUndefined();
    alice.session.stop();
    stranger.session.stop();
  });
});
