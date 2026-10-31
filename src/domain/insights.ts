import { addDays, localDate } from './dates';
import { historyForRange } from './history';
import type { Routine, RoutineLog } from './models';
import { occurrencesForDate } from './schedule';

export function getStats(
  routines: Routine[],
  logs: RoutineLog[],
  now = new Date(),
  days = 7,
) {
  const end = localDate(now);
  const start = addDays(end, 1 - days);
  const entries = historyForRange(routines, logs, start, end, now);
  const done = entries.filter((log) => log.status === 'done').length;
  const skipped = entries.filter((log) => log.status === 'skipped').length;
  const missed = entries
    .filter((log) => log.status === 'missed')
    .reduce((sum, log) => sum + log.missingCount, 0);
  const pending = occurrencesForDate(routines, logs, end, now).filter(
    (item) => item.status === 'pending' && !item.weeklyProgress,
  ).length;
  const denominator = done + skipped + missed + pending;
  return {
    done,
    skipped,
    missed,
    regularity: denominator ? Math.round((done / denominator) * 100) : 0,
    activity: Array.from({ length: days }, (_, index) => {
      const date = addDays(start, index);
      return {
        date,
        done: entries.filter(
          (log) => log.scheduledFor === date && log.status === 'done',
        ).length,
      };
    }),
  };
}
