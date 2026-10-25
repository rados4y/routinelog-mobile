import type { LocalDate } from './models';

// Calendar dates are local; UTC is used only for integer calendar arithmetic (DST-safe).
export function localDate(date = new Date()): LocalDate {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function calendarDate(date: LocalDate): Date {
  return new Date(`${date}T12:00:00`);
}
function dayNumber(date: LocalDate): number {
  return Date.parse(`${date}T00:00:00Z`) / 86400000;
}
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return dayNumber(to) - dayNumber(from);
}
export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date((dayNumber(date) + days) * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function weekday(date: LocalDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}
export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, 1 - weekday(date));
}
export function dateLabel(
  date: LocalDate,
  options?: Intl.DateTimeFormatOptions,
): string {
  return calendarDate(date).toLocaleDateString(
    'pl-PL',
    options ?? { weekday: 'long', day: 'numeric', month: 'long' },
  );
}
