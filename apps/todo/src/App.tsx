import { type FormEvent, useState } from "react";
import { canSchedule, googleCalendarUrl, icsFileName, outlookCalendarUrl, toIcs } from "./calendar.ts";
import { addTodo, removeTodo, renameList, type Todo, type TodoDraft, updateTodo, visibleTodos } from "./model.ts";
import { shareUrl } from "./share.ts";
import { type Live, useLists } from "./useLists.ts";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

function downloadIcs(todos: Todo[], listName: string, fileName: string) {
  const blob = new Blob([toIcs(todos, listName)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function describeWhen(todo: Todo): string {
  if (!todo.date) return "";
  const [year, month, day] = todo.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayText = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (!todo.time) return dayText;
  const [hour, minute] = todo.time.split(":").map(Number);
  date.setHours(hour, minute);
  return `${dayText}, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · ${todo.minutes} min`;
}

function isOverdue(todo: Todo): boolean {
  if (!todo.date || todo.done) return false;
  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return todo.date < stamp;
}

function TodoForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Todo;
  submitLabel: string;
  onSubmit: (draft: Required<TodoDraft>) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), notes: notes.trim(), date, time: date ? time : "", minutes });
    if (!initial) {
      setTitle("");
      setNotes("");
      setTime("");
    }
  };

  return (
    <form className="todo-form" onSubmit={submit}>
      <label className="field field-title">
        <span>Todo</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          required
        />
      </label>
      <label className="field field-notes">
        <span>Notes</span>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
      </label>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label className="field">
        <span>Time</span>
        <input type="time" value={time} disabled={!date} onChange={(event) => setTime(event.target.value)} />
      </label>
      <label className="field">
        <span>Length</span>
        <select value={minutes} disabled={!time} onChange={(event) => setMinutes(Number(event.target.value))}>
          {DURATIONS.map((value) => (
            <option key={value} value={value}>
              {value < 60 ? `${value} min` : `${value / 60} hr`}
            </option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <button type="submit" className="primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function CalendarMenu({ todo, listName }: { todo: Todo; listName: string }) {
  const google = googleCalendarUrl(todo, listName);
  const outlook = outlookCalendarUrl(todo, listName);
  if (!google || !outlook) return null;
  return (
    <details className="calendar-menu">
      <summary aria-label={`Add "${todo.title}" to calendar`}>Add to calendar</summary>
      <div className="menu">
        <a href={google} target="_blank" rel="noreferrer">
          Google Calendar
        </a>
        <a href={outlook} target="_blank" rel="noreferrer">
          Outlook
        </a>
        <button type="button" onClick={() => downloadIcs([todo], listName, icsFileName(todo.title))}>
          Apple / other (.ics)
        </button>
      </div>
    </details>
  );
}

function TodoItem({
  todo,
  listName,
  onChange,
  onRemove,
}: {
  todo: Todo;
  listName: string;
  onChange: (change: Partial<Todo>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="todo editing">
        <TodoForm
          initial={todo}
          submitLabel="Save"
          onSubmit={(draft) => {
            onChange(draft);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }
  const when = describeWhen(todo);
  return (
    <li className={`todo${todo.done ? " done" : ""}`}>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={(event) => onChange({ done: event.target.checked })}
        aria-label={`Mark "${todo.title}" ${todo.done ? "not done" : "done"}`}
      />
      <div className="todo-body">
        <span className="todo-title">{todo.title}</span>
        {(when || todo.notes) && (
          <span className="todo-meta">
            {when && <span className={isOverdue(todo) ? "overdue" : undefined}>{when}</span>}
            {todo.notes && <span>{todo.notes}</span>}
          </span>
        )}
      </div>
      <div className="todo-actions">
        <CalendarMenu todo={todo} listName={listName} />
        <button type="button" onClick={() => setEditing(true)} aria-label={`Edit "${todo.title}"`}>
          Edit
        </button>
        <button type="button" onClick={onRemove} aria-label={`Delete "${todo.title}"`}>
          Delete
        </button>
      </div>
    </li>
  );
}

const statusText = (live: Live): string => {
  switch (live.status) {
    case "off":
      return "Only on this device";
    case "connecting":
      return "Connecting…";
    case "retrying":
      return "Reconnecting…";
    default:
      return live.peers === 0
        ? "Live · waiting for others"
        : `Live · ${live.peers} other ${live.peers === 1 ? "device" : "devices"}`;
  }
};

function SharePanel({ link, live, isLive, onLive }: { link: string; live: Live; isLive: boolean; onLive: (on: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="share" aria-label="Sharing">
      <p className={`status status-${live.status}`} role="status">
        <span className="dot" aria-hidden="true" />
        {statusText(live)}
      </p>
      <div className="share-row">
        <input readOnly value={link} aria-label="Share link" onFocus={(event) => event.target.select()} />
        <button type="button" className="primary" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={isLive} onChange={(event) => onLive(event.target.checked)} />
        Live sync with anyone who has this list open
      </label>
      <p className="hint">
        The link carries the list as it is now. Opening it merges it with any copy already on that device.
        With live sync on, changes flow directly between open browsers. Nothing is stored on a server.
      </p>
    </section>
  );
}

export function App() {
  const { list, lists, isLive, live, change, setLive, switchTo, createList, forgetList } = useLists();
  const [sharing, setSharing] = useState(false);
  const todos = visibleTodos(list);
  const scheduled = todos.filter((todo) => !todo.done && canSchedule(todo));
  const remaining = todos.filter((todo) => !todo.done).length;
  const link = shareUrl(window.location.href, list);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="list-picker">
          <label className="sr-only" htmlFor="list-switch">
            Switch list
          </label>
          <select id="list-switch" value={list.id} onChange={(event) => switchTo(event.target.value)}>
            {lists.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name || "Untitled list"}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => createList("New list")}>
            New list
          </button>
        </div>
        <input
          className="list-name"
          aria-label="List name"
          value={list.name}
          onChange={(event) => change((current) => renameList(current, event.target.value))}
        />
        <p className="summary">
          {remaining === 0 ? "Nothing left to do" : `${remaining} open`} · {statusText(live)}
        </p>
        <div className="masthead-actions">
          <button
            type="button"
            className="primary"
            aria-expanded={sharing}
            onClick={() => {
              setSharing(!sharing);
              if (!sharing) setLive(true);
            }}
          >
            Share
          </button>
          <button
            type="button"
            disabled={scheduled.length === 0}
            onClick={() => downloadIcs(scheduled, list.name, icsFileName(list.name))}
          >
            Export dated todos (.ics)
          </button>
        </div>
      </header>

      {sharing && <SharePanel link={link} live={live} isLive={isLive} onLive={setLive} />}

      <section aria-label="Add a todo" className="card">
        <TodoForm submitLabel="Add" onSubmit={(draft) => change((current) => addTodo(current, draft))} />
      </section>

      {todos.length === 0 ? (
        <p className="empty">No todos yet. Add one above, then share the list with whoever is doing it with you.</p>
      ) : (
        <ul className="todos" aria-label="Todos">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              listName={list.name}
              onChange={(update) => change((current) => updateTodo(current, todo.id, update))}
              onRemove={() => change((current) => removeTodo(current, todo.id))}
            />
          ))}
        </ul>
      )}

      <footer className="foot">
        <button
          type="button"
          className="quiet"
          onClick={() => {
            if (window.confirm(`Remove "${list.name}" from this device? Others keep their copies.`)) forgetList();
          }}
        >
          Remove this list from this device
        </button>
      </footer>
    </main>
  );
}
