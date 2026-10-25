import { addDays, localDate, weekStart } from './dates';
import type { Routine, RoutineLog } from './models';
import { routineOn } from './routine';
import { occurrencesForDate, weeklyDone } from './schedule';

export interface HistoryEntry extends RoutineLog {
  inferred: boolean;
  missingCount: number;
}

// Virtual missed entries are derived, never persisted: backdating a completion corrects them.
export function historyForRange(
  routines: Routine[],
  logs: RoutineLog[],
  from: string,
  to: string,
  now = new Date(),
): HistoryEntry[] {
  const result: HistoryEntry[] = logs
    .filter((log) => log.scheduledFor >= from && log.scheduledFor <= to)
    .map((log) => ({ ...log, inferred: false, missingCount: 1 }));
  const today = localDate(now);
  for (let date = from; date <= to && date < today; date = addDays(date, 1)) {
    for (const occurrence of occurrencesForDate(routines, logs, date, now)) {
      if (occurrence.status === 'missed' && !occurrence.log)
        result.push(missed(occurrence.routine, date, 1));
    }
    if (addDays(weekStart(date), 6) !== date) continue;
    for (const original of routines) {
      const routine = routineOn(original, date);
      if (!routine?.active || routine.schedule.kind !== 'weeklyTarget')
        continue;
      // If a target changed mid-week, use the target effective at window close.
      const deficit = Math.max(
        0,
        routine.schedule.count - weeklyDone(routine.id, date, logs),
      );
      if (deficit) result.push(missed(routine, date, deficit));
    }
  }
  return result.sort(
    (a, b) =>
      b.scheduledFor.localeCompare(a.scheduledFor) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}
function missed(routine: Routine, date: string, count: number): HistoryEntry {
  return {
    id: `missed:${routine.id}:${date}`,
    routineId: routine.id,
    scheduledFor: date,
    status: 'missed',
    completedAt: null,
    value: null,
    note: count > 1 ? `Brakuje ${count} wykonań do celu tygodniowego` : '',
    source: 'automation',
    createdAt: `${date}T23:59:59.000Z`,
    updatedAt: `${date}T23:59:59.000Z`,
    routineName: routine.name,
    routineIcon: routine.icon,
    inferred: true,
    missingCount: count,
  };
}
