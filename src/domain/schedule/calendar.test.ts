import { describe, expect, it } from 'vitest';
import { createLog } from '../log';
import { historyForRange } from '../history';
import { scheduleSchema, type Schedule } from '../models';
import { routine } from '../../test/fixtures';
import { matchesSchedule, occurrencesForDate, routineForEntry } from './index';
import { scheduleWindow } from './windows';
import {
  descriptionFor,
  inputFromColumn,
  columnName,
} from '../../integrations/notion/descriptions';

describe('calendar frequencies and flexible due dates', () => {
  const monthly: Schedule = {
    kind: 'monthlyDays',
    days: [15],
    lastDay: true,
    flexible: false,
  };
  it('matches selected month days and the real final day, including leap February', () => {
    for (const date of [
      '2026-02-15',
      '2026-02-28',
      '2028-02-29',
      '2026-04-30',
      '2026-12-31',
    ])
      expect(matchesSchedule(monthly, date)).toBe(true);
    for (const date of ['2026-02-16', '2026-04-29'])
      expect(matchesSchedule(monthly, date)).toBe(false);
    expect(
      matchesSchedule(
        { kind: 'monthlyDays', days: [31], lastDay: false, flexible: false },
        '2026-04-30',
      ),
    ).toBe(false);
  });
  it('deduplicates day 31 and Last into one due window', () => {
    expect(
      scheduleWindow(
        { kind: 'monthlyDays', days: [31], lastDay: true, flexible: true },
        '2026-01-31',
      ),
    ).toMatchObject({ start: '2026-01-31', end: '2026-02-27', target: 1 });
  });
  it('carries a due date until done or skipped, then starts a new occurrence at the next due date', () => {
    const r = {
      ...routine({
        kind: 'monthlyDays',
        days: [15],
        lastDay: false,
        flexible: true,
      }),
      effectiveFrom: '2026-10-01',
    };
    const now = new Date('2026-10-20T12:00:00');
    expect(occurrencesForDate([r], [], '2026-10-20', now)[0]?.status).toBe(
      'pending',
    );
    for (const status of ['done', 'skipped'] as const) {
      const logs = [createLog(r, '2026-10-17', status, now)];
      expect(occurrencesForDate([r], logs, '2026-10-20', now)).toEqual([]);
      expect(
        occurrencesForDate(
          [r],
          logs,
          '2026-11-15',
          new Date('2026-11-15T12:00:00'),
        ),
      ).toHaveLength(1);
      expect(occurrencesForDate([r], logs, '2026-10-17', now)[0]?.status).toBe(
        status,
      );
    }
  });
  it('does not invent a previous flexible occurrence before the routine started', () => {
    const r = {
      ...routine({
        kind: 'monthlyDays',
        days: [15],
        lastDay: false,
        flexible: true,
      }),
      effectiveFrom: '2026-11-02',
    };
    expect(
      occurrencesForDate(
        [r],
        [],
        '2026-11-02',
        new Date('2026-11-02T12:00:00'),
      ),
    ).toEqual([]);
    expect(
      occurrencesForDate(
        [r],
        [],
        '2026-11-15',
        new Date('2026-11-15T12:00:00'),
      ),
    ).toHaveLength(1);
  });
  it('produces a single missed only after a flexible window closes', () => {
    const r = {
      ...routine({
        kind: 'monthlyDays',
        days: [15],
        lastDay: true,
        flexible: true,
      }),
      effectiveFrom: '2026-10-15',
    };
    expect(
      historyForRange(
        [r],
        [],
        '2026-10-15',
        '2026-10-29',
        new Date('2026-10-30T12:00:00'),
      ),
    ).toEqual([]);
    const history = historyForRange(
      [r],
      [],
      '2026-10-15',
      '2026-10-31',
      new Date('2026-11-01T12:00:00'),
    );
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      scheduledFor: '2026-10-30',
      status: 'missed',
      missingCount: 1,
    });
  });
  it('retains an open flexible window when only metadata was edited', () => {
    const r = routine({
      kind: 'monthlyDays',
      days: [15],
      lastDay: false,
      flexible: true,
    });
    const revised = {
      ...r,
      effectiveFrom: '2026-10-18',
      revisions: [{ from: '2026-10-12', until: '2026-10-18', data: r }],
    };
    expect(
      occurrencesForDate(
        [revised],
        [],
        '2026-10-20',
        new Date('2026-10-20T12:00:00'),
      ),
    ).toHaveLength(1);
  });
  it('supports ordinal weekdays, including a missing fifth weekday', () => {
    const lastMonday: Schedule = {
      kind: 'monthlyWeekdays',
      weeks: [],
      lastWeek: true,
      days: [1],
      flexible: false,
    };
    expect(matchesSchedule(lastMonday, '2026-11-30')).toBe(true);
    expect(matchesSchedule(lastMonday, '2026-11-23')).toBe(false);
    const fifth = {
      ...lastMonday,
      weeks: [5],
      lastWeek: false,
      flexible: true,
    };
    expect(scheduleWindow(fifth, '2026-02-10')).toMatchObject({
      start: '2025-12-29',
      end: '2026-03-29',
    });
  });
  it('handles yearly dates and leap-day windows across a non-leap century', () => {
    const yearly: Schedule = {
      kind: 'yearlyDates',
      dates: [{ month: 2, day: 29 }],
      flexible: true,
    };
    expect(scheduleWindow(yearly, '2100-03-01')).toMatchObject({
      start: '2096-02-29',
      end: '2104-02-28',
    });
    expect(matchesSchedule({ ...yearly, flexible: false }, '2028-02-29')).toBe(
      true,
    );
    expect(
      scheduleSchema.safeParse({ ...yearly, dates: [{ month: 4, day: 31 }] })
        .success,
    ).toBe(false);
  });
  it('counts monthly targets at the window close rather than each unfinished day', () => {
    const r = {
      ...routine({ kind: 'monthlyTarget', count: 3 }),
      effectiveFrom: '2026-10-01',
    };
    const log = createLog(
      r,
      '2026-10-20',
      'done',
      new Date('2026-10-20T12:00:00'),
    );
    expect(
      historyForRange(
        [r],
        [log],
        '2026-10-01',
        '2026-10-29',
        new Date('2026-10-30T12:00:00'),
      ).filter((entry) => entry.inferred),
    ).toEqual([]);
    expect(
      historyForRange(
        [r],
        [log],
        '2026-10-01',
        '2026-10-31',
        new Date('2026-11-01T12:00:00'),
      ).find((entry) => entry.inferred),
    ).toMatchObject({ scheduledFor: '2026-10-31', missingCount: 2 });
    expect(routineForEntry(r, '2026-10-25')).toBeDefined();
  });
  it('round trips every new schedule through the Notion column description', () => {
    const schedules: Schedule[] = [
      monthly,
      { ...monthly, flexible: true },
      { kind: 'monthlyTarget', count: 4 },
      {
        kind: 'monthlyWeekdays',
        weeks: [1, 3],
        lastWeek: true,
        days: [2, 5],
        flexible: true,
      },
      {
        kind: 'yearlyDates',
        dates: [
          { month: 2, day: 29 },
          { month: 11, day: 2 },
        ],
        flexible: false,
      },
      { kind: 'weekdays', days: [1, 4], flexible: true },
    ];
    for (const schedule of schedules) {
      const r = routine(schedule);
      expect(
        inputFromColumn({
          id: 'p',
          name: columnName(r),
          description: descriptionFor(r),
          type: 'select',
        }).schedule,
      ).toEqual(schedule);
    }
  });
});
