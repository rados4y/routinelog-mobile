import { localDate } from './dates';
import type { Routine, RoutineLog } from './models';

export function createLog(
  routine: Routine,
  date: string,
  status: 'done' | 'skipped',
  now = new Date(),
): RoutineLog {
  if (date > localDate(now))
    throw new Error('Nie można oznaczyć przyszłego dnia.');
  return {
    id: `${routine.id}:${date}`,
    routineId: routine.id,
    scheduledFor: date,
    status,
    completedAt: status === 'done' ? now.toISOString() : null,
    value: null,
    note: '',
    source: 'app',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    routineName: routine.name,
    routineIcon: routine.icon,
  };
}
