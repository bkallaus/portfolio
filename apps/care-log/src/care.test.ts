import {
  addPerson,
  EMPTY_LOG,
  historyFor,
  latestFor,
  logEntry,
  parseLog,
  removeEntry,
  removePerson,
  timeSince,
  type NewEntry,
} from './care';

const withAda = addPerson(EMPTY_LOG, '  Ada ', 'ada');

const entry = (overrides: Partial<NewEntry> = {}): NewEntry => ({
  personId: 'ada',
  kind: 'feeding',
  at: '2026-09-29T08:00:00.000Z',
  detail: 'Oatmeal',
  amount: '1 bowl',
  note: '',
  ...overrides,
});

describe('people', () => {
  it('adds a trimmed name and ignores blanks', () => {
    expect(withAda.people).toEqual([{ id: 'ada', name: 'Ada' }]);
    expect(addPerson(withAda, '   ')).toBe(withAda);
  });

  it('removing a person drops their entries', () => {
    const log = logEntry(addPerson(withAda, 'Bo', 'bo'), entry({ personId: 'bo' }), 'e1');
    const next = removePerson(log, 'bo');
    expect(next.people.map((person) => person.name)).toEqual(['Ada']);
    expect(next.entries).toEqual([]);
  });
});

describe('entries', () => {
  it('logs feedings, grooming and medications with trimmed fields', () => {
    let log = logEntry(withAda, entry({ detail: ' Oatmeal ' }), 'e1');
    log = logEntry(log, entry({ kind: 'grooming', detail: 'Bath', amount: '' }), 'e2');
    log = logEntry(log, entry({ kind: 'medication', detail: 'Ibuprofen', amount: '200mg' }), 'e3');
    expect(log.entries.map((e) => [e.kind, e.detail])).toEqual([
      ['feeding', 'Oatmeal'],
      ['grooming', 'Bath'],
      ['medication', 'Ibuprofen'],
    ]);
  });

  it('rejects entries without a detail or for an unknown person', () => {
    expect(logEntry(withAda, entry({ detail: ' ' }))).toBe(withAda);
    expect(logEntry(withAda, entry({ personId: 'ghost' }))).toBe(withAda);
  });

  it('lists history newest first, filtered by kind', () => {
    let log = logEntry(withAda, entry({ at: '2026-09-29T08:00:00.000Z' }), 'early');
    log = logEntry(log, entry({ at: '2026-09-29T12:00:00.000Z' }), 'late');
    log = logEntry(log, entry({ kind: 'medication', detail: 'Vitamin D' }), 'med');
    expect(historyFor(log, 'ada').map((e) => e.id)).toEqual(['late', 'early', 'med']);
    expect(historyFor(log, 'ada', 'feeding').map((e) => e.id)).toEqual(['late', 'early']);
    expect(latestFor(log, 'ada', 'feeding')?.id).toBe('late');
    expect(latestFor(log, 'ada', 'grooming')).toBeUndefined();
    expect(removeEntry(log, 'late').entries.map((e) => e.id)).toEqual(['early', 'med']);
  });
});

describe('timeSince', () => {
  const now = new Date('2026-09-29T12:00:00.000Z');
  it.each([
    ['2026-09-29T11:59:40.000Z', 'just now'],
    ['2026-09-29T12:00:20.000Z', 'just now'],
    ['2026-09-29T11:15:00.000Z', '45m ago'],
    ['2026-09-29T09:00:00.000Z', '3h ago'],
    ['2026-09-29T09:30:00.000Z', '2h 30m ago'],
    ['2026-09-28T10:00:00.000Z', 'yesterday'],
    ['2026-09-25T12:00:00.000Z', '4d ago'],
    ['2026-09-29T13:00:00.000Z', 'scheduled'],
  ])('%s is %s', (at, expected) => {
    expect(timeSince(at, now)).toBe(expected);
  });
});

describe('parseLog', () => {
  it('returns an empty log for missing or corrupt data', () => {
    expect(parseLog(null)).toEqual(EMPTY_LOG);
    expect(parseLog('{nope')).toEqual(EMPTY_LOG);
  });

  it('keeps valid rows and drops malformed or orphaned ones', () => {
    const good = { ...entry(), id: 'e1' };
    const raw = JSON.stringify({
      people: [{ id: 'ada', name: 'Ada' }, { id: 3 }],
      entries: [good, { ...good, id: 'e2', kind: 'nap' }, { ...good, id: 'e3', personId: 'x' }],
    });
    expect(parseLog(raw)).toEqual({ people: [{ id: 'ada', name: 'Ada' }], entries: [good] });
  });
});
