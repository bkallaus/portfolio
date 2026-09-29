import { describe, expect, it } from "vitest";
import { canSchedule, googleCalendarUrl, icsFileName, outlookCalendarUrl, toIcs } from "./calendar.ts";
import { addTodo, emptyList } from "./model.ts";

const todoWith = (draft: Parameters<typeof addTodo>[1]) =>
  addTodo(emptyList("abcd1234", "Home"), draft, 1, "t1").todos.t1;

describe("calendar export", () => {
  it("only schedules todos with a date", () => {
    expect(canSchedule(todoWith({ title: "Someday" }))).toBe(false);
    expect(googleCalendarUrl(todoWith({ title: "Someday" }), "Home")).toBeNull();
    expect(canSchedule(todoWith({ title: "Pay rent", date: "2026-10-01" }))).toBe(true);
  });

  it("writes an all-day event when there is no time", () => {
    const ics = toIcs([todoWith({ title: "Pay rent", date: "2026-10-31" })], "Home", new Date(0));
    expect(ics).toContain("DTSTART;VALUE=DATE:20261031");
    expect(ics).toContain("DTEND;VALUE=DATE:20261101");
    expect(ics).toContain("SUMMARY:Pay rent");
    expect(ics).toContain("UID:t1@ben.kallaus.me");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("writes a timed event that lasts the todo's duration", () => {
    const todo = todoWith({ title: "Dentist", date: "2026-10-01", time: "09:30", minutes: 45 });
    const start = new Date(2026, 9, 1, 9, 30);
    const end = new Date(start.getTime() + 45 * 60_000);
    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = toIcs([todo], "Home", new Date(0));
    expect(ics).toContain(`DTSTART:${stamp(start)}`);
    expect(ics).toContain(`DTEND:${stamp(end)}`);
    expect(googleCalendarUrl(todo, "Home")).toContain(encodeURIComponent(`${stamp(start)}/${stamp(end)}`));
    expect(outlookCalendarUrl(todo, "Home")).toContain(encodeURIComponent(start.toISOString()));
  });

  it("escapes text and folds long lines", () => {
    const ics = toIcs([todoWith({ title: "Buy eggs, milk; bread", notes: "x".repeat(200), date: "2026-10-01" })], "Home");
    expect(ics).toContain("SUMMARY:Buy eggs\\, milk\\; bread");
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true);
  });

  it("names the file after the list", () => {
    expect(icsFileName("Family chores!")).toBe("family-chores.ics");
    expect(icsFileName("!!!")).toBe("todo.ics");
  });
});
