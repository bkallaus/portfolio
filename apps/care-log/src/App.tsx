import { type FormEvent, useEffect, useState } from 'react';
import {
  addPerson,
  type CareLog,
  historyFor,
  KINDS,
  type Kind,
  latestFor,
  loadLog,
  logEntry,
  removeEntry,
  removePerson,
  saveLog,
  timeSince,
} from './care';

const KIND_COPY: Record<
  Kind,
  { label: string; detail: string; amount: string; placeholder: string; accent: string }
> = {
  feeding: {
    label: 'Feeding',
    detail: 'Food',
    amount: 'Amount',
    placeholder: 'Oatmeal, formula, lunch…',
    accent: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  grooming: {
    label: 'Grooming',
    detail: 'Task',
    amount: 'Duration',
    placeholder: 'Bath, nail trim, haircut…',
    accent: 'bg-sky-100 text-sky-900 border-sky-300',
  },
  medication: {
    label: 'Medication',
    detail: 'Medication name',
    amount: 'Dose',
    placeholder: 'Ibuprofen, insulin…',
    accent: 'bg-rose-100 text-rose-900 border-rose-300',
  },
};

const toLocalInput = (date: Date): string => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatWhen = (at: string): string =>
  new Date(at).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const useNow = (): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
};

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none';

function AddPersonForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAdd(name);
    setName('');
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        aria-label="New person's name"
        placeholder="Add a person"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}

function EntryForm({
  personName,
  onLog,
}: {
  personName: string;
  onLog: (entry: { kind: Kind; at: string; detail: string; amount: string; note: string }) => void;
}) {
  const [kind, setKind] = useState<Kind>('feeding');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [whenEdited, setWhenEdited] = useState(false);
  const copy = KIND_COPY[kind];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const at = whenEdited && when ? new Date(when).toISOString() : new Date().toISOString();
    onLog({ kind, at, detail, amount, note });
    setDetail('');
    setAmount('');
    setNote('');
    setWhen(toLocalInput(new Date()));
    setWhenEdited(false);
  };

  return (
    <form
      onSubmit={submit}
      aria-label={`Log care for ${personName}`}
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5"
    >
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Type of care</legend>
        {KINDS.map((option) => (
          <label
            key={option}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-stone-400 ${
              kind === option ? KIND_COPY[option].accent : 'border-stone-200 text-stone-600'
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={option}
              checked={kind === option}
              onChange={() => setKind(option)}
              className="sr-only"
            />
            {KIND_COPY[option].label}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">{copy.detail}</span>
          <input
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder={copy.placeholder}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">{copy.amount}</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">When</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(event) => {
              setWhen(event.target.value);
              setWhenEdited(true);
            }}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">Note</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!detail.trim()}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Log {copy.label.toLowerCase()}
      </button>
    </form>
  );
}

export function App() {
  const [log, setLog] = useState<CareLog>(loadLog);
  const [selectedId, setSelectedId] = useState<string | undefined>(() => log.people[0]?.id);
  const [filter, setFilter] = useState<Kind | 'all'>('all');
  const now = useNow();

  useEffect(() => saveLog(log), [log]);

  const selected = log.people.find((person) => person.id === selectedId) ?? log.people[0];
  const history = selected
    ? historyFor(log, selected.id, filter === 'all' ? undefined : filter)
    : [];

  const handleAddPerson = (name: string) => {
    const next = addPerson(log, name);
    setLog(next);
    setSelectedId(next.people.at(-1)?.id);
  };

  const handleRemovePerson = (personId: string, name: string) => {
    if (window.confirm(`Remove ${name} and all of their history?`)) {
      setLog(removePerson(log, personId));
      setSelectedId(undefined);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Care Log</h1>
        <p className="mt-1 text-stone-600">
          Track feedings, grooming, and medications for the people you look after. Saved in this
          browser only.
        </p>
      </header>

      <section aria-label="People" className="mb-8 space-y-3">
        {log.people.length > 0 && (
          <div role="tablist" aria-label="Choose a person" className="flex flex-wrap gap-2">
            {log.people.map((person) => (
              <button
                key={person.id}
                type="button"
                role="tab"
                aria-selected={person.id === selected?.id}
                onClick={() => setSelectedId(person.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  person.id === selected?.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-700 ring-1 ring-stone-200'
                }`}
              >
                {person.name}
              </button>
            ))}
          </div>
        )}
        <AddPersonForm onAdd={handleAddPerson} />
      </section>

      {selected ? (
        <div className="space-y-8">
          <section aria-label={`Latest care for ${selected.name}`}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">{selected.name}</h2>
              <button
                type="button"
                onClick={() => handleRemovePerson(selected.id, selected.name)}
                className="text-sm text-stone-500 hover:text-rose-700"
              >
                Remove {selected.name}
              </button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {KINDS.map((kind) => {
                const latest = latestFor(log, selected.id, kind);
                return (
                  <li
                    key={kind}
                    aria-label={`Last ${KIND_COPY[kind].label.toLowerCase()}`}
                    className={`rounded-2xl border p-4 ${KIND_COPY[kind].accent}`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                      Last {KIND_COPY[kind].label.toLowerCase()}
                    </p>
                    {latest ? (
                      <>
                        <p className="mt-1 text-lg font-semibold">{timeSince(latest.at, now)}</p>
                        <p className="text-sm">
                          {latest.detail}
                          {latest.amount && ` · ${latest.amount}`}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm opacity-70">Nothing logged yet</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <EntryForm
            key={selected.id}
            personName={selected.name}
            onLog={(entry) => setLog(logEntry(log, { ...entry, personId: selected.id }))}
          />

          <section aria-label="History">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">History</h2>
              <label className="text-sm text-stone-600">
                Show{' '}
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as Kind | 'all')}
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1"
                >
                  <option value="all">Everything</option>
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_COPY[kind].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-stone-500">No entries yet.</p>
            ) : (
              <ol className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm">
                        <span
                          className={`mr-2 rounded-full border px-2 py-0.5 text-xs ${KIND_COPY[entry.kind].accent}`}
                        >
                          {KIND_COPY[entry.kind].label}
                        </span>
                        <span className="font-medium">{entry.detail}</span>
                        {entry.amount && <span className="text-stone-600"> · {entry.amount}</span>}
                      </p>
                      {entry.note && <p className="mt-1 text-sm text-stone-600">{entry.note}</p>}
                      <p className="mt-1 text-xs text-stone-500">
                        {formatWhen(entry.at)} · {timeSince(entry.at, now)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${entry.detail}`}
                      onClick={() => setLog(removeEntry(log, entry.id))}
                      className="text-sm text-stone-400 hover:text-rose-700"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-600">
          Add someone above to start logging their care.
        </p>
      )}
    </main>
  );
}
