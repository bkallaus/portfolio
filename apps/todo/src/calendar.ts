import type { Todo } from "./model.ts";

type Window = { start: Date; end: Date; allDay: boolean };

const pad = (value: number): string => String(value).padStart(2, "0");

function windowOf(todo: Todo): Window | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todo.date)) return null;
  const [year, month, day] = todo.date.split("-").map(Number);
  if (/^\d{2}:\d{2}$/.test(todo.time)) {
    const [hour, minute] = todo.time.split(":").map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    return { start, end: new Date(start.getTime() + Math.max(todo.minutes, 5) * 60_000), allDay: false };
  }
  return { start: new Date(year, month - 1, day), end: new Date(year, month - 1, day + 1), allDay: true };
}

export const canSchedule = (todo: Todo): boolean => windowOf(todo) !== null;

const utcStamp = (date: Date): string =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

const dayStamp = (date: Date): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

const escapeText = (text: string): string =>
  text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function eventLines(todo: Todo, listName: string, now: Date): string[] {
  const window = windowOf(todo);
  if (!window) return [];
  const when = window.allDay
    ? [`DTSTART;VALUE=DATE:${dayStamp(window.start)}`, `DTEND;VALUE=DATE:${dayStamp(window.end)}`]
    : [`DTSTART:${utcStamp(window.start)}`, `DTEND:${utcStamp(window.end)}`];
  const description = [todo.notes, `From the shared list "${listName}"`].filter(Boolean).join("\n\n");
  return [
    "BEGIN:VEVENT",
    `UID:${todo.id}@ben.kallaus.me`,
    `DTSTAMP:${utcStamp(now)}`,
    ...when,
    `SUMMARY:${escapeText(todo.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `STATUS:${todo.done ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ];
}

export function toIcs(todos: Todo[], listName: string, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ben.kallaus.me//Shared Todo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...todos.flatMap((todo) => eventLines(todo, listName, now)),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function googleCalendarUrl(todo: Todo, listName: string): string | null {
  const window = windowOf(todo);
  if (!window) return null;
  const dates = window.allDay
    ? `${dayStamp(window.start)}/${dayStamp(window.end)}`
    : `${utcStamp(window.start)}/${utcStamp(window.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: todo.title,
    dates,
    details: [todo.notes, `From the shared list "${listName}"`].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(todo: Todo, listName: string): string | null {
  const window = windowOf(todo);
  if (!window) return null;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: todo.title,
    startdt: window.allDay ? todo.date : window.start.toISOString(),
    enddt: window.allDay ? todo.date : window.end.toISOString(),
    allday: String(window.allDay),
    body: [todo.notes, `From the shared list "${listName}"`].filter(Boolean).join("\n\n"),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function icsFileName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "todo"}.ics`;
}
