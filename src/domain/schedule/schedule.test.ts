import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localDate, weekday, weekStart } from '../dates';
import { createLog } from '../log';
import { createRoutine, updateRoutine } from '../routine';
import { routine, monday } from '../../test/fixtures';
import {
  completion,
  matchesSchedule,
  occurrencesForDate,
  scheduleLabel,
} from './index';

describe('calendar arithmetic', () => {
  it('uses Monday windows across month/year boundaries', () => {
    expect(weekStart('2027-01-03')).toBe('2026-12-28');
    expect(weekday(monday)).toBe(1);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(localDate(new Date('2026-10-12T23:59:00'))).toBe(monday);
  });
});
describe('schedule engine', () => {
  it('matches daily, business days and selected weekdays', () => {
    expect(matchesSchedule({ kind: 'daily' }, '2026-10-18')).toBe(true);
    expect(
      matchesSchedule(
        { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
        '2026-10-17',
      ),
    ).toBe(false);
    expect(matchesSchedule({ kind: 'weekdays', days: [1, 4] }, monday)).toBe(
      true,
    );
    expect(
      matchesSchedule({ kind: 'weekdays', days: [1, 4] }, '2026-10-13'),
    ).toBe(false);
  });
  it.each([1, 2, 7, 30])('matches anchored intervals of %i days', (every) => {
    const schedule = { kind: 'interval' as const, every, anchor: monday };
    expect(matchesSchedule(schedule, monday)).toBe(true);
    expect(matchesSchedule(schedule, addDays(monday, every))).toBe(true);
    expect(matchesSchedule(schedule, addDays(monday, -every))).toBe(false);
    if (every > 1)
      expect(matchesSchedule(schedule, addDays(monday, 1))).toBe(false);
  });
  it('supports flexible weekly goals without hard-coded weekdays', () => {
    expect(
      matchesSchedule({ kind: 'weeklyTarget', count: 3 }, '2026-10-18'),
    ).toBe(true);
    expect(scheduleLabel({ kind: 'weeklyTarget', count: 1 })).toContain('1×');
  });
  it('selects only active and scheduled routines on a selected day', () => {
    const daily = routine();
    const otherDay = {
      ...routine({ kind: 'weekdays', days: [3] }),
      id: 'other',
    };
    const disabled = { ...routine(), id: 'disabled', active: false };
    expect(
      occurrencesForDate(
        [daily, otherDay, disabled],
        [],
        monday,
        new Date(`${monday}T10:00:00`),
      ),
    ).toHaveLength(1);
  });
  it('does not infer missed before a routine was created', () => {
    expect(occurrencesForDate([routine()], [], '2026-10-11')).toHaveLength(0);
  });
  it('separates pending, overdue and missed', () => {
    const beforeTime = occurrencesForDate(
      [routine()],
      [],
      monday,
      new Date(`${monday}T07:30:00`),
    )[0];
    expect(beforeTime).toMatchObject({ status: 'pending', overdue: false });
    expect(
      occurrencesForDate(
        [routine()],
        [],
        monday,
        new Date(`${monday}T09:00:00`),
      )[0],
    ).toMatchObject({ status: 'pending', overdue: true });
    expect(
      occurrencesForDate(
        [routine()],
        [],
        monday,
        new Date('2026-10-13T09:00:00'),
      )[0],
    ).toMatchObject({ status: 'missed', overdue: false });
    expect(
      occurrencesForDate(
        [routine()],
        [],
        '2026-10-14',
        new Date(`${monday}T09:00:00`),
      )[0],
    ).toMatchObject({ status: 'pending', overdue: false });
  });
  it.each(['done', 'skipped'] as const)(
    'keeps %s from becoming missed',
    (status) => {
      const r = routine();
      const logs = [
        createLog(r, monday, status, new Date(`${monday}T10:00:00`)),
      ];
      expect(
        occurrencesForDate(
          [r],
          logs,
          monday,
          new Date('2026-10-15T12:00:00'),
        )[0]?.status,
      ).toBe(status);
    },
  );
  it('keeps weekly goals pending until the window closes', () => {
    const r = routine({ kind: 'weeklyTarget', count: 3 });
    expect(
      occurrencesForDate([r], [], monday, new Date('2026-10-15T12:00:00'))[0],
    ).toMatchObject({
      status: 'pending',
      overdue: false,
      weeklyProgress: { done: 0, target: 3 },
    });
    expect(
      occurrencesForDate([r], [], monday, new Date('2026-10-19T12:00:00')),
    ).toHaveLength(0);
  });
  it('counts weekly completion and starts a fresh window on Monday', () => {
    const r = routine({ kind: 'weeklyTarget', count: 1 });
    const logs = [createLog(r, monday, 'done', new Date(`${monday}T12:00:00`))];
    expect(
      occurrencesForDate(
        [r],
        logs,
        '2026-10-13',
        new Date('2026-10-13T12:00:00'),
      ),
    ).toHaveLength(0);
    expect(
      occurrencesForDate(
        [r],
        logs,
        '2026-10-19',
        new Date('2026-10-19T12:00:00'),
      )[0]?.weeklyProgress?.done,
    ).toBe(0);
    expect(
      occurrencesForDate([r], logs, monday, new Date(`${monday}T12:00:00`))[0]
        ?.status,
    ).toBe('done');
  });
  it('preserves past schedules and pauses only from today', () => {
    const r = updateRoutine(
      routine(),
      {
        ...routine(),
        active: false,
        schedule: { kind: 'weekdays', days: [7] },
      },
      new Date('2026-10-14T12:00:00'),
    );
    expect(
      occurrencesForDate([r], [], monday, new Date('2026-10-15T12:00:00'))[0]
        ?.status,
    ).toBe('missed');
    expect(
      occurrencesForDate(
        [r],
        [],
        '2026-10-14',
        new Date('2026-10-15T12:00:00'),
      ),
    ).toHaveLength(0);
  });
  it('computes percentage and handles an empty plan', () => {
    const r = routine();
    const second = { ...r, id: 'second' };
    const logs = [createLog(r, monday, 'done', new Date(`${monday}T12:00:00`))];
    expect(
      completion(
        occurrencesForDate(
          [r, second],
          logs,
          monday,
          new Date(`${monday}T12:00:00`),
        ),
      ),
    ).toEqual({ done: 1, total: 2, percent: 50 });
    expect(completion([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
  it('rejects invalid user data and future completions', () => {
    expect(() => createRoutine({ ...routine(), name: ' ' }, 'bad')).toThrow();
    expect(() =>
      createRoutine({ ...routine(), reminderTime: '25:00' }, 'bad'),
    ).toThrow();
    expect(() =>
      createLog(
        routine(),
        '2026-10-13',
        'done',
        new Date(`${monday}T12:00:00`),
      ),
    ).toThrow();
  });
});
