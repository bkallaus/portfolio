export type Kind = 'feeding' | 'grooming' | 'medication';

export const KINDS: Kind[] = ['feeding', 'grooming', 'medication'];

export type Person = {
  id: string;
  name: string;
};

export type Entry = {
  id: string;
  personId: string;
  kind: Kind;
  at: string;
  detail: string;
  amount: string;
  note: string;
};

export type CareLog = {
  people: Person[];
  entries: Entry[];
};

export type NewEntry = Omit<Entry, 'id'>;

export const EMPTY_LOG: CareLog = { people: [], entries: [] };

export const STORAGE_KEY = 'care-log:v1';

const newId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const addPerson = (log: CareLog, name: string, id: string = newId()): CareLog => {
  const trimmed = name.trim();
  if (!trimmed) return log;
  return { ...log, people: [...log.people, { id, name: trimmed }] };
};

export const removePerson = (log: CareLog, personId: string): CareLog => ({
  people: log.people.filter((person) => person.id !== personId),
  entries: log.entries.filter((entry) => entry.personId !== personId),
});

export const logEntry = (log: CareLog, entry: NewEntry, id: string = newId()): CareLog => {
  const detail = entry.detail.trim();
  if (!detail || !log.people.some((person) => person.id === entry.personId)) return log;
  return {
    ...log,
    entries: [
      ...log.entries,
      { ...entry, id, detail, amount: entry.amount.trim(), note: entry.note.trim() },
    ],
  };
};

export const removeEntry = (log: CareLog, entryId: string): CareLog => ({
  ...log,
  entries: log.entries.filter((entry) => entry.id !== entryId),
});

const newestFirst = (a: Entry, b: Entry): number => Date.parse(b.at) - Date.parse(a.at);

export const historyFor = (log: CareLog, personId: string, kind?: Kind): Entry[] =>
  log.entries
    .filter((entry) => entry.personId === personId && (!kind || entry.kind === kind))
    .sort(newestFirst);

export const latestFor = (log: CareLog, personId: string, kind: Kind): Entry | undefined =>
  historyFor(log, personId, kind)[0];

export const timeSince = (at: string, now: Date): string => {
  const elapsed = now.getTime() - Date.parse(at);
  if (elapsed < -60000) return 'scheduled';
  const minutes = Math.max(0, Math.floor(elapsed / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m ago` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

const isKind = (value: unknown): value is Kind => KINDS.includes(value as Kind);

const isPerson = (value: unknown): value is Person => {
  const person = value as Person;
  return typeof person?.id === 'string' && typeof person.name === 'string';
};

const isEntry = (value: unknown): value is Entry => {
  const entry = value as Entry;
  return (
    typeof entry?.id === 'string' &&
    typeof entry.personId === 'string' &&
    isKind(entry.kind) &&
    typeof entry.at === 'string' &&
    !Number.isNaN(Date.parse(entry.at)) &&
    typeof entry.detail === 'string' &&
    typeof entry.amount === 'string' &&
    typeof entry.note === 'string'
  );
};

export const parseLog = (raw: string | null): CareLog => {
  if (!raw) return EMPTY_LOG;
  try {
    const data = JSON.parse(raw) as Partial<CareLog>;
    const people = Array.isArray(data.people) ? data.people.filter(isPerson) : [];
    const ids = new Set(people.map((person) => person.id));
    const entries = Array.isArray(data.entries)
      ? data.entries.filter(isEntry).filter((entry) => ids.has(entry.personId))
      : [];
    return { people, entries };
  } catch {
    return EMPTY_LOG;
  }
};

export const loadLog = (): CareLog => {
  try {
    return parseLog(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_LOG;
  }
};

export const saveLog = (log: CareLog): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    return;
  }
};
