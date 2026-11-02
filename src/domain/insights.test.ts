import { describe, expect, it } from 'vitest';
import { historyForRange } from './history';
import { getStats } from './insights';
import { createLog } from './log';
import { monday, routine } from '../test/fixtures';

describe('history and statistics', () => {
  const now = new Date('2026-10-18T22:00:00');
  it('computes seven-day stats, including missed closed dates and pending today', () => {
    const r = routine();
    const logs = [
      createLog(r, monday, 'done', now),
      createLog(r, '2026-10-13', 'skipped', now),
    ];
    const stats = getStats([r], logs, now);
    expect(stats).toMatchObject({
      done: 1,
      skipped: 1,
      missed: 4,
      regularity: 14,
    });
    expect(stats.activity).toHaveLength(7);
    expect(stats.activity[0]).toEqual({ date: monday, done: 1 });
    expect(stats.activity[6]?.date).toBe('2026-10-18');
  });
  it('does not count logs outside the requested range', () => {
    const r = routine();
    expect(
      getStats(
        [r],
        [createLog(r, monday, 'done', now)],
        new Date('2026-10-25T12:00:00'),
      ).done,
    ).toBe(0);
  });
  it('counts weekly deficits only after the window closes, once per week', () => {
    const r = routine({ kind: 'weeklyTarget', count: 3 });
    const logs = [createLog(r, monday, 'done', now)];
    expect(getStats([r], logs, now).missed).toBe(0);
    const closed = new Date('2026-10-19T00:01:00');
    const entries = historyForRange([r], logs, monday, '2026-10-19', closed);
    expect(entries.filter((entry) => entry.status === 'missed')).toHaveLength(
      1,
    );
    expect(entries[0]).toMatchObject({
      scheduledFor: '2026-10-18',
      missingCount: 2,
      source: 'automation',
    });
    expect(getStats([r], logs, closed).missed).toBe(2);
  });
  it('repairs inferred missed after a backdated completion and keeps chronological order', () => {
    const r = routine();
    const logs = [
      createLog(r, monday, 'done', now),
      createLog(r, '2026-10-14', 'done', now),
    ];
    const entries = historyForRange([r], logs, monday, '2026-10-14', now);
    expect(entries.map((entry) => entry.status)).toEqual([
      'done',
      'missed',
      'done',
    ]);
    expect(entries[2]?.routineName).toBe(r.name);
  });
  it('handles empty statistics', () => {
    expect(getStats([], [], now)).toMatchObject({
      done: 0,
      skipped: 0,
      missed: 0,
      regularity: 0,
    });
  });
});

it('scopes per-routine history and statistics to that routine even with a shared log collection', () => {
  const r = routine();
  const other = { ...r, id: 'other', name: 'Inna rutyna' };
  const now = new Date(`${monday}T12:00:00`);
  const logs = [createLog(other, monday, 'done', now)];
  expect(historyForRange([r], logs, monday, monday, now)).toEqual([]);
  expect(getStats([r], logs, now)).toMatchObject({ done: 0, regularity: 0 });
  expect(getStats([other], logs, now)).toMatchObject({
    done: 1,
    regularity: 100,
  });
  expect(getStats([r, other], logs, now).done).toBe(1);
  expect(getStats([], logs, now).done).toBe(0);
});
