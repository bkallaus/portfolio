export type Todo = {
  id: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  minutes: number;
  done: boolean;
  deleted: boolean;
  updatedAt: number;
};

export type TodoList = {
  id: string;
  name: string;
  nameUpdatedAt: number;
  todos: Record<string, Todo>;
};

export type TodoDraft = {
  title: string;
  notes?: string;
  date?: string;
  time?: string;
  minutes?: number;
};

export const newId = (length = 10): string => {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

export const emptyList = (id = newId(), name = "Shared list", now = Date.now()): TodoList => ({
  id,
  name,
  nameUpdatedAt: now,
  todos: {},
});

export function addTodo(list: TodoList, draft: TodoDraft, now = Date.now(), id = newId()): TodoList {
  const todo: Todo = {
    id,
    title: draft.title.trim(),
    notes: draft.notes?.trim() ?? "",
    date: draft.date ?? "",
    time: draft.time ?? "",
    minutes: draft.minutes ?? 30,
    done: false,
    deleted: false,
    updatedAt: now,
  };
  return { ...list, todos: { ...list.todos, [id]: todo } };
}

export function updateTodo(
  list: TodoList,
  id: string,
  change: Partial<Omit<Todo, "id" | "updatedAt">>,
  now = Date.now()
): TodoList {
  const current = list.todos[id];
  if (!current) return list;
  const updatedAt = Math.max(now, current.updatedAt + 1);
  return { ...list, todos: { ...list.todos, [id]: { ...current, ...change, updatedAt } } };
}

export const removeTodo = (list: TodoList, id: string, now = Date.now()): TodoList =>
  updateTodo(list, id, { deleted: true }, now);

export function renameList(list: TodoList, name: string, now = Date.now()): TodoList {
  return { ...list, name, nameUpdatedAt: Math.max(now, list.nameUpdatedAt + 1) };
}

const newer = (a: Todo, b: Todo): Todo => {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
};

export function mergeLists(mine: TodoList, theirs: TodoList): TodoList {
  const todos: Record<string, Todo> = { ...mine.todos };
  for (const [id, todo] of Object.entries(theirs.todos)) {
    todos[id] = todos[id] ? newer(todos[id], todo) : todo;
  }
  const theirName =
    theirs.nameUpdatedAt > mine.nameUpdatedAt ||
    (theirs.nameUpdatedAt === mine.nameUpdatedAt && theirs.name > mine.name);
  return {
    id: mine.id,
    name: theirName ? theirs.name : mine.name,
    nameUpdatedAt: Math.max(mine.nameUpdatedAt, theirs.nameUpdatedAt),
    todos,
  };
}

export const sameList = (a: TodoList, b: TodoList): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const sortKey = (todo: Todo): string => `${todo.date || "9999-99-99"}T${todo.time || "99:99"}`;

export function visibleTodos(list: TodoList): Todo[] {
  return Object.values(list.todos)
    .filter((todo) => !todo.deleted)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const byWhen = sortKey(a).localeCompare(sortKey(b));
      return byWhen !== 0 ? byWhen : a.title.localeCompare(b.title);
    });
}

export function isTodoList(value: unknown): value is TodoList {
  if (!value || typeof value !== "object") return false;
  const list = value as Partial<TodoList>;
  return (
    typeof list.id === "string" &&
    typeof list.name === "string" &&
    typeof list.nameUpdatedAt === "number" &&
    !!list.todos &&
    typeof list.todos === "object" &&
    Object.values(list.todos).every(
      (todo) => !!todo && typeof todo.id === "string" && typeof todo.title === "string" && typeof todo.updatedAt === "number"
    )
  );
}
