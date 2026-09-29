export type Chore = {
  id: string;
  name: string;
  everyDays: number;
  lastDone: string;
};

export const CHORES_STORAGE_KEY = 'recurringChores';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

export const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dayNumber = (isoDay: string) => {
  const [year, month, day] = isoDay.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
};

export const daysUntilDue = (chore: Chore, today: Date) =>
  dayNumber(chore.lastDone) + chore.everyDays - dayNumber(toIsoDay(today));

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export const describeDue = (days: number) => {
  if (days < 0) return `Overdue by ${plural(-days, 'day')}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${plural(days, 'day')}`;
};

export const sortByDue = (chores: Chore[], today: Date) =>
  [...chores].sort((a, b) => daysUntilDue(a, today) - daysUntilDue(b, today));

const isChore = (value: unknown): value is Chore => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.everyDays === 'number' &&
    typeof candidate.lastDone === 'string'
  );
};

export const loadChores = (): Chore[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CHORES_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isChore) : [];
  } catch {
    return [];
  }
};

export const saveChores = (chores: Chore[]) => {
  try {
    localStorage.setItem(CHORES_STORAGE_KEY, JSON.stringify(chores));
  } catch {
    return;
  }
};
