import { addDays, daysBetween, localDate, weekday, weekStart } from '../dates';
import type {
  LocalDate,
  Occurrence,
  Routine,
  RoutineLog,
  Schedule,
} from '../models';
import { routineOn, routineStartDate } from '../routine';
import {
  isFlexible,
  matchesCalendar,
  scheduleWindow,
  windowDone,
  windowResolved,
} from './windows';

export function matchesSchedule(schedule: Schedule, date: LocalDate): boolean {
  switch (schedule.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return isFlexible(schedule) || schedule.days.includes(weekday(date));
    case 'interval':
      return (
        date >= schedule.anchor &&
        daysBetween(schedule.anchor, date) % schedule.every === 0
      );
    case 'weeklyTarget':
    case 'monthlyTarget':
      return true;
    case 'monthlyDays':
    case 'monthlyWeekdays':
    case 'yearlyDates':
      return isFlexible(schedule) || matchesCalendar(schedule, date);
  }
}
export function scheduleLabel(schedule: Schedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'weeklyTarget':
      return `${schedule.count}× per week · flexible`;
    case 'monthlyTarget':
      return `${schedule.count}× per month · flexible`;
    case 'monthlyDays':
      return `Days of month: ${[...schedule.days].sort((a, b) => a - b).join(', ')}${schedule.lastDay ? `${schedule.days.length ? ', ' : ''}last` : ''}${schedule.flexible ? ' · flexible' : ''}`;
    case 'monthlyWeekdays':
      return `${schedule.weeks.join(', ')}${schedule.lastWeek ? `${schedule.weeks.length ? ', ' : ''}last` : ''} week · ${scheduleLabel({ kind: 'weekdays', days: schedule.days })}${schedule.flexible ? ' · flexible' : ''}`;
    case 'yearlyDates':
      return `${schedule.dates.map((value) => `${value.day}.${String(value.month).padStart(2, '0')}`).join(', ')}${schedule.flexible ? ' · flexible' : ''}`;
    case 'interval':
      return schedule.every === 1
        ? 'Every day'
        : `Every ${schedule.every} days`;
    case 'weekdays': {
      if (
        [1, 2, 3, 4, 5].every((day) => schedule.days.includes(day)) &&
        schedule.days.length === 5
      )
        return 'Monday–Friday';
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return (
        [...schedule.days]
          .sort((a, b) => a - b)
          .map((day) => labels[day - 1])
          .join(', ') + (schedule.flexible ? ' · flexible' : '')
      );
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
export function routineForEntry(
  original: Routine,
  date: LocalDate,
): Routine | undefined {
  const routine = routineOn(original, date);
  if (!routine?.active || !matchesSchedule(routine.schedule, date))
    return undefined;
  const window = scheduleWindow(routine.schedule, date);
  if (
    isFlexible(routine.schedule) &&
    (!window || window.start < routineStartDate(original))
  )
    return undefined;
  return routine;
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
      const log = logs.find(
        (item) => item.routineId === original.id && item.scheduledFor === date,
      );
      const routine = routineOn(original, date) ?? (log ? original : undefined);
      if (
        !routine ||
        (!log && (!routine.active || !matchesSchedule(routine.schedule, date)))
      )
        return [];
      const weeklyProgress =
        routine.schedule.kind === 'weeklyTarget'
          ? {
              done: weeklyDone(routine.id, date, logs),
              target: routine.schedule.count,
            }
          : undefined;
      const window = scheduleWindow(routine.schedule, date);
      const firstDate = routineStartDate(original);
      if (
        !log &&
        isFlexible(routine.schedule) &&
        window &&
        window.start < firstDate
      )
        return [];
      const windowProgress = window
        ? { ...window, done: windowDone(routine.id, window, logs) }
        : undefined;
      // Flexible targets have no daily failure. Closed-window deficits live in history/statistics.
      if (
        window &&
        !log &&
        (window.end < today ||
          windowResolved(routine.id, routine.schedule, window, logs))
      )
        return [];
      const status =
        log?.status ?? (!window && date < today ? 'missed' : 'pending');
      return [
        {
          routine,
          date,
          status,
          log,
          weeklyProgress,
          windowProgress,
          overdue:
            status === 'pending' &&
            !window &&
            date === today &&
            routine.reminderTime <
              `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.routine.reminderTime.localeCompare(b.routine.reminderTime) ||
        (a.routine.sortOrder ?? 0) - (b.routine.sortOrder ?? 0) ||
        a.routine.createdAt.localeCompare(b.routine.createdAt),
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
