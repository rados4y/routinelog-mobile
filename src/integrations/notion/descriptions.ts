import {
  routineInputSchema,
  type Routine,
  type RoutineInput,
  type Schedule,
} from '../../domain/models';
import type { Column, CellStatus } from './models';
import { isNotesColumn } from './dailyNotes';

export const statusNames = {
  done: 'Wykonane',
  skipped: 'Pominięte',
  missed: 'Niewykonane',
} as const;
export const supportedColumn = (column: Column) =>
  !isNotesColumn(column) &&
  ['checkbox', 'select', 'rich_text'].includes(column.type);
export const columnName = (routine: RoutineInput) =>
  `${routine.icon} ${routine.name}`;
export function planText(schedule: Schedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'codziennie';
    case 'weekdays':
      return `dni ${schedule.days.join(',')}${schedule.flexible ? ' elastycznie' : ''}`;
    case 'interval':
      return `co ${schedule.every} dni od ${schedule.anchor}`;
    case 'weeklyTarget':
      return `${schedule.count}x/tydzień`;
    case 'monthlyTarget':
      return `${schedule.count}x/miesiąc`;
    case 'monthlyDays':
      return `miesiąc ${[...schedule.days]
        .sort((a, b) => a - b)
        .map(String)
        .concat(schedule.lastDay ? ['ostatni'] : [])
        .join(',')}${schedule.flexible ? ' elastycznie' : ''}`;
    case 'monthlyWeekdays':
      return `tygodnie ${schedule.weeks
        .map(String)
        .concat(schedule.lastWeek ? ['ostatni'] : [])
        .join(
          ',',
        )} dni ${schedule.days.join(',')}${schedule.flexible ? ' elastycznie' : ''}`;
    case 'yearlyDates':
      return `rok ${schedule.dates.map((item) => `${item.day}.${item.month}`).join(',')}${schedule.flexible ? ' elastycznie' : ''}`;
  }
}
export function parsePlan(value: string): Schedule {
  const flexible = value.endsWith(' elastycznie');
  const plain = flexible ? value.slice(0, -' elastycznie'.length) : value;
  if (flexible && /^dni [1-7](,[1-7])*$/.test(plain))
    return {
      kind: 'weekdays',
      days: plain.slice(4).split(',').map(Number),
      flexible: true,
    };
  const monthlyTarget = /^(\d+)[x×]\/miesiąc$/.exec(value);
  if (monthlyTarget)
    return { kind: 'monthlyTarget', count: Number(monthlyTarget[1]) };
  const monthly = /^miesiąc ([\d,]+|(?:\d+,)*ostatni)$/.exec(plain);
  if (monthly) {
    const values = monthly[1]!.split(',');
    return {
      kind: 'monthlyDays',
      days: values.filter((day) => day !== 'ostatni').map(Number),
      lastDay: values.includes('ostatni'),
      flexible,
    };
  }
  const ordinal =
    /^tygodnie ([\d,]+|(?:\d+,)*ostatni) dni ([1-7](?:,[1-7])*)$/.exec(plain);
  if (ordinal) {
    const values = ordinal[1]!.split(',');
    return {
      kind: 'monthlyWeekdays',
      weeks: values.filter((week) => week !== 'ostatni').map(Number),
      lastWeek: values.includes('ostatni'),
      days: ordinal[2]!.split(',').map(Number),
      flexible,
    };
  }
  const yearly = /^rok (\d+\.\d+(?:,\d+\.\d+)*)$/.exec(plain);
  if (yearly)
    return {
      kind: 'yearlyDates',
      dates: yearly[1]!.split(',').map((item) => {
        const [day, month] = item.split('.').map(Number);
        return { day: day!, month: month! };
      }),
      flexible,
    };
  if (value === 'codziennie') return { kind: 'daily' };
  if (value === 'poniedziałek–piątek')
    return { kind: 'weekdays', days: [1, 2, 3, 4, 5] };
  const weekly = /^(\d+)[x×]\/tydzień$/.exec(value);
  if (weekly) return { kind: 'weeklyTarget', count: Number(weekly[1]) };
  const interval = /^co (\d+) dni od (\d{4}-\d{2}-\d{2})$/.exec(value);
  if (interval)
    return {
      kind: 'interval',
      every: Number(interval[1]),
      anchor: interval[2]!,
    };
  if (/^dni [1-7](,[1-7])*$/.test(value))
    return { kind: 'weekdays', days: value.slice(4).split(',').map(Number) };
  throw new Error(
    'Unknown column schedule. Supported Notion values: codziennie, dni 1,3,5, 3x/tydzień, or co 7 dni od YYYY-MM-DD.',
  );
}
export function descriptionFor(routine: Routine): string {
  return [
    routine.note,
    `Kategoria: ${routine.category}`,
    `Godzina: ${routine.reminderTime}`,
    `Plan: ${planText(routine.schedule)}`,
    `Aktywna: ${routine.active ? 'tak' : 'nie'}`,
    `Cel: ${routine.target ?? ''}`,
    `Jednostka: ${routine.unit ?? ''}`,
    `Link: routinelog://routine-editor?id=${encodeURIComponent(routine.id)}`,
  ]
    .filter(Boolean)
    .join('\n');
}
export function linkedRoutineId(column: Column): string | undefined {
  const match = /routinelog:\/\/routine-editor\?id=([^\s\\]+)/.exec(
    column.description,
  );
  try {
    return match ? decodeURIComponent(match[1]!) : undefined;
  } catch {
    return undefined;
  }
}
export function inputFromColumn(
  column: Column,
  fallback?: RoutineInput,
): RoutineInput {
  const parts = column.name.trim().split(/\s+/);
  const hasIcon =
    /\p{Extended_Pictographic}/u.test(parts[0] ?? '') && parts.length > 1;
  const fields: Record<string, string> = {};
  const note: string[] = [];
  for (const line of column.description.replace(/\\+n/g, '\n').split('\n')) {
    const match =
      /^(Kategoria|Godzina|Plan|Aktywna|Cel|Jednostka|Link):\s*(.*)$/.exec(
        line,
      );
    if (match) fields[match[1]!] = match[2]!;
    else note.push(line);
  }
  const result = routineInputSchema.safeParse({
    name: (hasIcon ? parts.slice(1).join(' ') : column.name).trim(),
    icon: hasIcon ? parts[0] : (fallback?.icon ?? '✅'),
    category: fields.Kategoria ?? fallback?.category ?? 'Inne',
    reminderTime: fields.Godzina ?? fallback?.reminderTime ?? '08:00',
    schedule: fields.Plan
      ? parsePlan(fields.Plan)
      : (fallback?.schedule ?? { kind: 'daily' }),
    active: fields.Aktywna
      ? ({ tak: true, nie: false } as Record<string, boolean>)[fields.Aktywna]
      : (fallback?.active ?? true),
    target: Object.hasOwn(fields, 'Cel')
      ? fields.Cel
        ? Number(fields.Cel)
        : null
      : (fallback?.target ?? null),
    unit: Object.hasOwn(fields, 'Jednostka')
      ? fields.Jednostka || null
      : (fallback?.unit ?? null),
    note: note.join('\n').trim(),
    checklist: fallback?.checklist,
    startDate: fallback?.startDate,
    endDate: fallback?.endDate,
  });
  if (!result.success)
    throw new Error(
      `Fix the description for “${column.name}”: category, time or schedule.`,
    );
  return result.data;
}
export function statusFromText(value: string): CellStatus {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'pending';
  if (['wykonane', 'done', '✓', '✅', 'x', 'tak', 'true'].includes(normalized))
    return 'done';
  if (['pominięte', 'skipped', '↷', 'skip'].includes(normalized))
    return 'skipped';
  if (['niewykonane', 'missed', '✗'].includes(normalized)) return 'missed';
  throw new Error(
    `Unknown Notion status. Use Wykonane (done), Pominięte (skipped), Niewykonane (not done), or an empty cell.`,
  );
}
export function cellWrite(
  column: Column,
  status: CellStatus,
): Record<string, unknown> {
  if (column.type === 'checkbox') return { checkbox: status === 'done' };
  const name = status === 'pending' ? null : statusNames[status];
  if (column.type === 'rich_text')
    return {
      rich_text: name ? [{ type: 'text', text: { content: name } }] : [],
    };
  return { [column.type]: name ? { name } : null };
}
export function observableStatus(
  column: Column,
  status: CellStatus,
): CellStatus {
  return column.type === 'checkbox' && status !== 'done' ? 'pending' : status;
}
export function newColumn(routine: Routine): Record<string, unknown> {
  return {
    description: descriptionFor(routine),
    select: {
      options: Object.entries(statusNames).map(([status, name]) => ({
        name,
        color:
          status === 'done' ? 'green' : status === 'skipped' ? 'orange' : 'red',
      })),
    },
  };
}
