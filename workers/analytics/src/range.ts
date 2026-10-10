const defaultDays = 30;
const maxDays = 365;

export function sinceDay(daysParam: string | null, now: Date): string {
  const parsed = Number.parseInt(daysParam ?? '', 10);
  const days = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), maxDays) : defaultDays;
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return since.toISOString().slice(0, 10);
}
