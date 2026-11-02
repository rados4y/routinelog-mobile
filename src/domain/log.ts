import { localDate } from './dates';
import type { ChecklistResult, Routine, RoutineLog } from './models';
import { requireCompleteChecklist } from './checklist';

export function createLog(
  routine: Routine,
  date: string,
  status: RoutineLog['status'],
  now = new Date(),
  checklist: ChecklistResult[] = [],
): RoutineLog {
  if (date > localDate(now))
    throw new Error('Nie można oznaczyć przyszłego dnia.');
  const completedChecklist =
    status === 'done'
      ? requireCompleteChecklist(routine.checklist, checklist)
      : [];
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
    ...(completedChecklist.length ? { checklist: completedChecklist } : {}),
  };
}
