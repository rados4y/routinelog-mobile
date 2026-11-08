import { describe, expect, it } from 'vitest';
import { createRoutine, routineOn, updateRoutine } from './routine';
import { occurrencesForDate } from './schedule';
import { historyForRange } from './history';
import { createLog } from './log';
import { monday, routine } from '../test/fixtures';

describe('explicit routine date ranges', () => {
  it('includes both range boundaries and excludes other automatic occurrences', () => {
    const r = createRoutine(
      { ...routine(), startDate: '2026-10-10', endDate: '2026-10-14' },
      'range',
      new Date(`${monday}T12:00:00`),
    );
    for (const date of ['2026-10-09', '2026-10-15'])
      expect(occurrencesForDate([r], [], date)).toEqual([]);
    for (const date of ['2026-10-10', '2026-10-14'])
      expect(occurrencesForDate([r], [], date)).toHaveLength(1);
  });
  it('preserves historical schedule revisions when a later edit changes the end date', () => {
    const r = createRoutine(
      { ...routine(), startDate: '2026-10-10' },
      'range',
      new Date(`${monday}T12:00:00`),
    );
    const updated = updateRoutine(
      r,
      { ...r, name: 'Edited', endDate: '2026-10-20' },
      new Date('2026-10-16T12:00:00'),
    );
    expect(routineOn(updated, '2026-10-10')?.name).toBe(r.name);
    expect(routineOn(updated, '2026-10-13')?.name).toBe(r.name);
    expect(routineOn(updated, '2026-10-17')?.name).toBe('Edited');
    expect(routineOn(updated, '2026-10-21')).toBeUndefined();
  });
  it('keeps actual log history outside a revised range without manufacturing missed days', () => {
    const original = routine();
    const log = createLog(
      original,
      monday,
      'done',
      new Date(`${monday}T12:00:00`),
    );
    const r = { ...original, startDate: '2026-10-13', endDate: '2026-10-14' };
    const history = historyForRange(
      [r],
      [log],
      '2026-10-01',
      '2026-10-18',
      new Date('2026-10-19T12:00:00'),
    );
    expect(
      history
        .filter((entry) => entry.inferred)
        .map((entry) => entry.scheduledFor)
        .sort(),
    ).toEqual(['2026-10-13', '2026-10-14']);
    expect(history.find((entry) => entry.status === 'done')?.scheduledFor).toBe(
      monday,
    );
  });
});
