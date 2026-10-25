import { addDays, daysBetween, localDate, weekday, weekStart } from '../dates';
import type {
  LocalDate,
  Occurrence,
  Routine,
  RoutineLog,
  Schedule,
} from '../models';
import { routineOn } from '../routine';

export function matchesSchedule(schedule: Schedule, date: LocalDate): boolean {
  switch (schedule.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return schedule.days.includes(weekday(date));
    case 'interval':
      return (
        date >= schedule.anchor &&
        daysBetween(schedule.anchor, date) % schedule.every === 0
      );
    case 'weeklyTarget':
      return true;
  }
}
export function scheduleLabel(schedule: Schedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Codziennie';
    case 'weeklyTarget':
      return `${schedule.count}× w tygodniu · elastycznie`;
    case 'interval':
      return schedule.every === 1 ? 'Codziennie' : `Co ${schedule.every} dni`;
    case 'weekdays': {
      if (
        [1, 2, 3, 4, 5].every((day) => schedule.days.includes(day)) &&
        schedule.days.length === 5
      )
        return 'Poniedziałek–piątek';
      const labels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
      return [...schedule.days]
        .sort((a, b) => a - b)
        .map((day) => labels[day - 1])
        .join(', ');
    }
  }
}
export function weeklyDone(
  routineId: string,
  date: LocalDate,
  logs: RoutineLog[],
): number {
  const start = weekStart(date);
  const end = addDays(start, 6);
  return new Set(
    logs
      .filter(
        (log) =>
          log.routineId === routineId &&
          log.status === 'done' &&
          log.scheduledFor >= start &&
          log.scheduledFor <= end,
      )
      .map((log) => log.scheduledFor),
  ).size;
}
export function occurrencesForDate(
  routines: Routine[],
  logs: RoutineLog[],
  date: LocalDate,
  now = new Date(),
): Occurrence[] {
  const today = localDate(now);
  return routines
    .flatMap((original): Occurrence[] => {
      const routine = routineOn(original, date);
      const log = logs.find(
        (item) => item.routineId === original.id && item.scheduledFor === date,
      );
      if (
        !routine ||
        !routine.active ||
        (!log && !matchesSchedule(routine.schedule, date))
      )
        return [];
      const weeklyProgress =
        routine.schedule.kind === 'weeklyTarget'
          ? {
              done: weeklyDone(routine.id, date, logs),
              target: routine.schedule.count,
            }
          : undefined;
      // Flexible targets have no daily failure. Closed-window deficits live in history/statistics.
      if (
        weeklyProgress &&
        !log &&
        (addDays(weekStart(date), 6) < today ||
          weeklyProgress.done >= weeklyProgress.target)
      )
        return [];
      const status =
        log?.status ?? (!weeklyProgress && date < today ? 'missed' : 'pending');
      return [
        {
          routine,
          date,
          status,
          log,
          weeklyProgress,
          overdue:
            status === 'pending' &&
            !weeklyProgress &&
            date === today &&
            routine.reminderTime <
              `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        },
      ];
    })
    .sort((a, b) =>
      a.routine.reminderTime.localeCompare(b.routine.reminderTime),
    );
}
export function completion(occurrences: Occurrence[]): {
  done: number;
  total: number;
  percent: number;
} {
  const done = occurrences.filter((item) => item.status === 'done').length;
  const total = occurrences.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
