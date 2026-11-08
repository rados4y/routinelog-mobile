import { scheduleSchema, type Schedule } from '../../../domain/models';
import { parsePlan } from '../descriptions';
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const daysText = (days: number[]) =>
  days.map((day) => weekdays[day - 1]).join(', ');
const ints = (text: string) =>
  text.trim() ? text.split(',').map((item) => Number(item.trim())) : [];
const parseDays = (text: string) =>
  text
    .split(',')
    .map(
      (day) =>
        weekdays.findIndex(
          (name) => name.toLowerCase() === day.trim().toLowerCase(),
        ) + 1,
    );
export function frequencyText(schedule: Schedule): string {
  const suffix =
    'flexible' in schedule && schedule.flexible ? '; flexible' : '';
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return `Weekly days: ${daysText(schedule.days)}${suffix}`;
    case 'interval':
      return `Every ${schedule.every} days from ${schedule.anchor}`;
    case 'weeklyTarget':
      return `${schedule.count}x/week`;
    case 'monthlyTarget':
      return `${schedule.count}x/month`;
    case 'monthlyDays':
      return `Monthly days: ${schedule.days
        .map(String)
        .concat(schedule.lastDay ? ['last'] : [])
        .join(', ')}${suffix}`;
    case 'monthlyWeekdays':
      return `Monthly weeks: ${schedule.weeks
        .map(String)
        .concat(schedule.lastWeek ? ['last'] : [])
        .join(', ')}; weekdays: ${daysText(schedule.days)}${suffix}`;
    case 'yearlyDates':
      return `Yearly dates: ${schedule.dates.map((date) => `${date.day}.${date.month}`).join(', ')}${suffix}`;
  }
}
export function parseFrequency(text: string): Schedule {
  const flexible = /;\s*flexible$/i.test(text.trim());
  const plain = text.trim().replace(/;\s*flexible$/i, '');
  const weekly = /^(\d+)[x×]\s*\/\s*week$/i.exec(plain);
  const monthly = /^(\d+)[x×]\s*\/\s*month$/i.exec(plain);
  const interval = /^Every (\d+) days? from (\d{4}-\d{2}-\d{2})$/i.exec(plain);
  const days = /^Weekly days:\s*(.+)$/i.exec(plain);
  const monthDays = /^Monthly days:\s*(.+)$/i.exec(plain);
  const monthWeeks = /^Monthly weeks:\s*(.+);\s*weekdays:\s*(.+)$/i.exec(plain);
  const yearly = /^Yearly dates:\s*(.+)$/i.exec(plain);
  let result: Schedule;
  if (!plain || /^Every day$/i.test(plain)) result = { kind: 'daily' };
  else if (/^Monday[–-]Friday$/i.test(plain))
    result = { kind: 'weekdays', days: [1, 2, 3, 4, 5] };
  else if (weekly) result = { kind: 'weeklyTarget', count: Number(weekly[1]) };
  else if (monthly)
    result = { kind: 'monthlyTarget', count: Number(monthly[1]) };
  else if (interval)
    result = {
      kind: 'interval',
      every: Number(interval[1]),
      anchor: interval[2]!,
    };
  else if (days)
    result = {
      kind: 'weekdays',
      days: parseDays(days[1]!),
      ...(flexible ? { flexible } : {}),
    };
  else if (monthDays || monthWeeks) {
    const values = (monthDays?.[1] ?? monthWeeks![1]!)
      .split(',')
      .map((value) => value.trim());
    const numeric = ints(
      values.filter((value) => value.toLowerCase() !== 'last').join(','),
    );
    const last = values.some((value) => value.toLowerCase() === 'last');
    result = monthDays
      ? { kind: 'monthlyDays', days: numeric, lastDay: last, flexible }
      : {
          kind: 'monthlyWeekdays',
          weeks: numeric,
          lastWeek: last,
          days: parseDays(monthWeeks![2]!),
          flexible,
        };
  } else if (yearly)
    result = {
      kind: 'yearlyDates',
      dates: yearly[1]!.split(',').map((part) => {
        const [day, month] = part.trim().split('.').map(Number);
        return { day: day!, month: month! };
      }),
      flexible,
    };
  else {
    try {
      result = parsePlan(text);
    } catch {
      throw new Error(
        `Invalid Frequency. Use Every day, Weekly days: Mon, Wed, 3x/week, Monthly days: 15, last; flexible, or Every 7 days from YYYY-MM-DD.`,
      );
    }
  }
  const parsed = scheduleSchema.safeParse(result);
  if (!parsed.success)
    throw new Error(
      'Invalid Frequency. Check the days, count and dates in the Routines database.',
    );
  return parsed.data;
}
