import { describe, expect, it } from "vitest";
import {
  addTodo,
  emptyList,
  isTodoList,
  mergeLists,
  removeTodo,
  renameList,
  updateTodo,
  visibleTodos,
} from "./model.ts";

const base = () => emptyList("abcd1234", "Groceries", 100);

describe("todo list edits", () => {
  it("adds a trimmed todo with defaults", () => {
    const list = addTodo(base(), { title: "  Milk  " }, 200, "t1");
    expect(list.todos.t1).toMatchObject({ title: "Milk", done: false, deleted: false, minutes: 30, updatedAt: 200 });
  });

  it("always moves updatedAt forward, even with a lagging clock", () => {
    const list = addTodo(base(), { title: "Milk" }, 500, "t1");
    expect(updateTodo(list, "t1", { done: true }, 100).todos.t1.updatedAt).toBe(501);
  });

  it("hides deleted todos and sorts open, dated work first", () => {
    let list = addTodo(base(), { title: "Later" }, 1, "a");
    list = addTodo(list, { title: "Soon", date: "2026-10-01" }, 1, "b");
    list = addTodo(list, { title: "Sooner", date: "2026-10-01", time: "08:00" }, 1, "c");
    list = addTodo(list, { title: "Finished", date: "2026-01-01" }, 1, "d");
    list = addTodo(list, { title: "Gone" }, 1, "e");
    list = updateTodo(list, "d", { done: true }, 2);
    list = removeTodo(list, "e", 2);
    expect(visibleTodos(list).map((todo) => todo.title)).toEqual(["Sooner", "Soon", "Later", "Finished"]);
  });
});

describe("mergeLists", () => {
  it("keeps todos added on either side", () => {
    const mine = addTodo(base(), { title: "Mine" }, 200, "m");
    const theirs = addTodo(base(), { title: "Theirs" }, 200, "t");
    expect(Object.keys(mergeLists(mine, theirs).todos).sort()).toEqual(["m", "t"]);
  });

  it("takes the most recent edit of the same todo", () => {
    const shared = addTodo(base(), { title: "Milk" }, 200, "t1");
    const mine = updateTodo(shared, "t1", { done: true }, 300);
    const theirs = updateTodo(shared, "t1", { title: "Oat milk" }, 400);
    expect(mergeLists(mine, theirs).todos.t1).toMatchObject({ title: "Oat milk", done: false });
    expect(mergeLists(theirs, mine).todos.t1).toMatchObject({ title: "Oat milk", done: false });
  });

  it("does not resurrect a deleted todo from a stale copy", () => {
    const shared = addTodo(base(), { title: "Milk" }, 200, "t1");
    const mine = removeTodo(shared, "t1", 300);
    expect(visibleTodos(mergeLists(mine, shared))).toEqual([]);
    expect(visibleTodos(mergeLists(shared, mine))).toEqual([]);
  });

  it("is order independent on a tie", () => {
    const shared = addTodo(base(), { title: "Milk" }, 200, "t1");
    const mine = updateTodo(shared, "t1", { title: "A" }, 300);
    const theirs = updateTodo(shared, "t1", { title: "B" }, 300);
    expect(mergeLists(mine, theirs)).toEqual(mergeLists(theirs, mine));
  });

  it("takes the latest list name", () => {
    const renamed = renameList(base(), "Weekend", 300);
    expect(mergeLists(base(), renamed).name).toBe("Weekend");
    expect(mergeLists(renamed, base()).name).toBe("Weekend");
  });
});

describe("isTodoList", () => {
  it("accepts a list and rejects junk", () => {
    expect(isTodoList(addTodo(base(), { title: "x" }))).toBe(true);
    expect(isTodoList({ id: "x" })).toBe(false);
    expect(isTodoList(null)).toBe(false);
    expect(isTodoList({ ...base(), todos: { a: { id: 1 } } })).toBe(false);
  });
});
