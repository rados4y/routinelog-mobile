import { describe, expect, it } from 'vitest';
import { entryBlockReason, routineForStatusEntry } from './entry';
import { routine, monday } from '../test/fixtures';
import { createLog } from './log';
import { occurrencesForDate } from './schedule';
import { historyForRange } from './history';

describe('manual routine calendar entries', () => {
  it('allows off-schedule dates in a calendar while keeping automatic scheduling strict', () => {
    const r = routine({ kind: 'weekdays', days: [7] });
    expect(routineForStatusEntry(r, monday)).toBeUndefined();
    expect(routineForStatusEntry(r, monday, 'calendar')).toEqual(r);
    expect(occurrencesForDate([r], [], monday)).toEqual([]);
  });
  it('unblocks the first partial window of an imported flexible month-end routine', () => {
    const date = '2026-11-02';
    const r = {
      ...routine({
        kind: 'monthlyDays',
        days: [],
        lastDay: true,
        flexible: true,
      }),
      effectiveFrom: date,
    };
    expect(routineForStatusEntry(r, date, 'scheduled')).toBeUndefined();
    expect(routineForStatusEntry(r, date, 'calendar')).toEqual(r);
    expect(
      occurrencesForDate([r], [], date, new Date(`${date}T12:00:00`)),
    ).toEqual([]);
    const log = createLog(r, date, 'done', new Date(`${date}T12:00:00`));
    expect(occurrencesForDate([r], [log], date)[0]?.status).toBe('done');
  });
  it('allows recording before import without manufacturing earlier scheduled days or missed entries', () => {
    const r = routine();
    const date = '2026-10-10';
    const manual = routineForStatusEntry(r, date, 'calendar')!;
    const log = createLog(manual, date, 'done', new Date(`${monday}T12:00:00`));
    expect(occurrencesForDate([r], [log], date)[0]?.status).toBe('done');
    expect(occurrencesForDate([r], [], date)).toEqual([]);
    expect(
      historyForRange(
        [r],
        [log],
        '2026-10-01',
        date,
        new Date(`${monday}T12:00:00`),
      ),
    ).toEqual([expect.objectContaining({ status: 'done', inferred: false })]);
    expect(r.effectiveFrom).toBe(monday);
  });
  it('can edit an imported log even when schedule history predates the local routine', () => {
    const r = { ...routine(), active: false };
    expect(routineForStatusEntry(r, '2026-10-01', 'scheduled', true)).toEqual(
      r,
    );
    expect(routineForStatusEntry(r, '2026-10-01', 'calendar')).toBeUndefined();
  });
  it('still rejects future and invalid dates with an explanation', () => {
    expect(
      entryBlockReason(routine(), '2026-10-13', 'calendar', false, monday),
    ).toContain('Future date');
    expect(
      entryBlockReason(routine(), '2026-02-30', 'calendar', false, monday),
    ).toBe('Invalid date.');
    expect(
      entryBlockReason(
        { ...routine(), active: false },
        monday,
        'calendar',
        false,
        monday,
      ),
    ).toContain('paused');
    expect(
      entryBlockReason(routine(), '2026-10-01', 'calendar', false, monday),
    ).toBeUndefined();
  });
});
