import {
  routineInputSchema,
  type Routine,
  type RoutineInput,
  type Schedule,
} from '../../domain/models';
import type { Column, CellStatus } from './models';

export const statusNames = {
  done: 'Wykonane',
  skipped: 'Pominięte',
  missed: 'Niewykonane',
} as const;
export const supportedColumn = (column: Column) =>
  ['checkbox', 'select', 'rich_text'].includes(column.type);
export const columnName = (routine: RoutineInput) =>
  `${routine.icon} ${routine.name}`;
export function planText(schedule: Schedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'codziennie';
    case 'weekdays':
      return `dni ${schedule.days.join(',')}`;
    case 'interval':
      return `co ${schedule.every} dni od ${schedule.anchor}`;
    case 'weeklyTarget':
      return `${schedule.count}x/tydzień`;
  }
}
function parsePlan(value: string): Schedule {
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
    'Nieznany plan w opisie kolumny. Użyj: codziennie, dni 1,3,5, 3x/tydzień lub co 7 dni od RRRR-MM-DD.',
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
  });
  if (!result.success)
    throw new Error(
      `Popraw opis kolumny „${column.name}”: kategorię, godzinę lub plan.`,
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
    `Nieznane oznaczenie w Notion. Użyj Wykonane, Pominięte, Niewykonane lub pustego pola.`,
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
