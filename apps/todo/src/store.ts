import { emptyList, isTodoList, type TodoList } from "./model.ts";

const LISTS_KEY = "todo:lists";
const CURRENT_KEY = "todo:current";
const LIVE_KEY = "todo:live";

export type Saved = {
  lists: Record<string, TodoList>;
  currentId: string;
  live: string[];
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function loadSaved(): Saved {
  const stored = read<Record<string, unknown>>(LISTS_KEY, {});
  const lists: Record<string, TodoList> = {};
  for (const value of Object.values(stored ?? {})) {
    if (isTodoList(value)) lists[value.id] = value;
  }
  let currentId = read<string>(CURRENT_KEY, "");
  if (!lists[currentId]) {
    const first = Object.keys(lists)[0];
    if (first) currentId = first;
    else {
      const fresh = emptyList();
      lists[fresh.id] = fresh;
      currentId = fresh.id;
    }
  }
  const live = read<unknown>(LIVE_KEY, []);
  return {
    lists,
    currentId,
    live: Array.isArray(live) ? live.filter((id): id is string => typeof id === "string" && !!lists[id]) : [],
  };
}

export function save(saved: Saved): void {
  write(LISTS_KEY, saved.lists);
  write(CURRENT_KEY, saved.currentId);
  write(LIVE_KEY, saved.live);
}
