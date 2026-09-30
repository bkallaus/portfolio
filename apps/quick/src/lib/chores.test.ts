import { describeDue, daysUntilDue, loadChores, saveChores, sortByDue, toIsoDay } from './chores';

const chore = (name: string, everyDays: number, lastDone: string) => ({
  id: name,
  name,
  everyDays,
  lastDone,
});

const today = new Date(2026, 8, 29);

describe('chores', () => {
  test('toIsoDay formats the local calendar day', () => {
    expect(toIsoDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  test('a chore done today is due after its interval', () => {
    expect(daysUntilDue(chore('Vacuum', 7, '2026-09-29'), today)).toBe(7);
  });

  test('a chore past its interval is overdue', () => {
    expect(daysUntilDue(chore('Mop', 7, '2026-09-19'), today)).toBe(-3);
  });

  test('intervals cross month boundaries', () => {
    expect(daysUntilDue(chore('Filter', 30, '2026-09-15'), today)).toBe(16);
  });

  test('describes due dates in words', () => {
    expect(describeDue(-3)).toBe('Overdue by 3 days');
    expect(describeDue(-1)).toBe('Overdue by 1 day');
    expect(describeDue(0)).toBe('Due today');
    expect(describeDue(1)).toBe('Due tomorrow');
    expect(describeDue(5)).toBe('Due in 5 days');
  });

  test('sorts the most overdue chore first', () => {
    const sorted = sortByDue(
      [chore('Sheets', 14, '2026-09-25'), chore('Trash', 3, '2026-09-24'), chore('Plants', 5, '2026-09-28')],
      today,
    );
    expect(sorted.map(({ name }) => name)).toEqual(['Trash', 'Plants', 'Sheets']);
  });

  test('saved chores load back', () => {
    localStorage.clear();
    const chores = [chore('Dust', 10, '2026-09-20')];
    saveChores(chores);
    expect(loadChores()).toEqual(chores);
  });

  test('corrupt storage loads as an empty list', () => {
    localStorage.setItem('recurringChores', '{not json');
    expect(loadChores()).toEqual([]);
  });
});
