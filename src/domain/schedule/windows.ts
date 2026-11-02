import { addDays, weekday, weekStart } from '../dates';
import type { RoutineLog, Schedule } from '../models';

export const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
export function shiftMonth(date: string, offset: number): string {
  const value = new Date(`${monthStart(date)}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return value.toISOString().slice(0, 10);
}
export const monthEnd = (date: string) => addDays(shiftMonth(date, 1), -1);
export const isPeriodTarget = (schedule: Schedule) =>
  schedule.kind === 'weeklyTarget' || schedule.kind === 'monthlyTarget';
export const isFlexible = (schedule: Schedule) =>
  'flexible' in schedule && schedule.flexible === true;

export function matchesCalendar(schedule: Schedule, date: string): boolean {
  const day = Number(date.slice(-2));
  switch (schedule.kind) {
    case 'monthlyDays':
      return (
        schedule.days.includes(day) ||
        (schedule.lastDay && date === monthEnd(date))
      );
    case 'monthlyWeekdays':
      return (
        schedule.days.includes(weekday(date)) &&
        (schedule.weeks.includes(Math.ceil(day / 7)) ||
          (schedule.lastWeek &&
            addDays(date, 7).slice(0, 7) !== date.slice(0, 7)))
      );
    case 'yearlyDates':
      return schedule.dates.some(
        (value) =>
          value.month === Number(date.slice(5, 7)) && value.day === day,
      );
    case 'weekdays':
      return schedule.days.includes(weekday(date));
    default:
      return false;
  }
}
export interface ScheduleWindow {
  start: string;
  end: string;
  target: number;
  due: string;
}
function nearbyDates(schedule: Schedule, date: string): string[] {
  const result = new Set<string>();
  if (schedule.kind === 'yearlyDates') {
    const year = Number(date.slice(0, 4));
    // Feb 29 can be eight years apart across a non-leap century.
    for (let offset = -8; offset <= 8; offset++) {
      for (const item of schedule.dates) {
        const value = `${year + offset}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
        if (new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value)
          result.add(value);
      }
    }
  } else if (schedule.kind === 'weekdays') {
    for (let offset = -7; offset <= 7; offset++) {
      const value = addDays(date, offset);
      if (matchesCalendar(schedule, value)) result.add(value);
    }
  } else if (schedule.kind === 'monthlyDays') {
    for (let offset = -2; offset <= 2; offset++) {
      const start = shiftMonth(date, offset);
      const end = monthEnd(start);
      for (const day of schedule.days)
        if (day <= Number(end.slice(-2)))
          result.add(`${start.slice(0, 8)}${String(day).padStart(2, '0')}`);
      if (schedule.lastDay) result.add(end);
    }
  } else if (schedule.kind === 'monthlyWeekdays') {
    for (let offset = -6; offset <= 6; offset++) {
      const start = shiftMonth(date, offset);
      const end = monthEnd(start);
      for (const day of schedule.days) {
        for (const week of schedule.weeks) {
          const number = 1 + ((day - weekday(start) + 7) % 7) + (week - 1) * 7;
          if (number <= Number(end.slice(-2)))
            result.add(
              `${start.slice(0, 8)}${String(number).padStart(2, '0')}`,
            );
        }
        if (schedule.lastWeek)
          result.add(addDays(end, -(weekday(end) - day + 7) % 7));
      }
    }
  }
  return [...result].sort();
}
export function scheduleWindow(
  schedule: Schedule,
  date: string,
): ScheduleWindow | undefined {
  if (schedule.kind === 'weeklyTarget') {
    const start = weekStart(date);
    return {
      start,
      end: addDays(start, 6),
      due: start,
      target: schedule.count,
    };
  }
  if (schedule.kind === 'monthlyTarget')
    return {
      start: monthStart(date),
      end: monthEnd(date),
      due: monthStart(date),
      target: schedule.count,
    };
  if (!isFlexible(schedule)) return undefined;
  const candidates = nearbyDates(schedule, date);
  const start = candidates.filter((value) => value <= date).at(-1);
  const next = candidates.find((value) => value > date);
  return start && next
    ? { start, end: addDays(next, -1), due: start, target: 1 }
    : undefined;
}
export function windowDone(
  routineId: string,
  window: ScheduleWindow,
  logs: RoutineLog[],
): number {
  return new Set(
    logs
      .filter(
        (log) =>
          log.routineId === routineId &&
          log.status === 'done' &&
          log.scheduledFor >= window.start &&
          log.scheduledFor <= window.end,
      )
      .map((log) => log.scheduledFor),
  ).size;
}
export function windowResolved(
  routineId: string,
  schedule: Schedule,
  window: ScheduleWindow,
  logs: RoutineLog[],
): boolean {
  return (
    windowDone(routineId, window, logs) >= window.target ||
    (!isPeriodTarget(schedule) &&
      logs.some(
        (log) =>
          log.routineId === routineId &&
          log.status === 'skipped' &&
          log.scheduledFor >= window.start &&
          log.scheduledFor <= window.end,
      ))
  );
}
