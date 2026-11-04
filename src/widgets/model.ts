import { z } from 'zod';
import { localDate, dateLabel } from '../domain/dates';
import type { Routine, RoutineLog, OccurrenceStatus } from '../domain/models';
import { occurrencesForDate } from '../domain/schedule';
import { nextStatus } from '../domain/status';
import { categoryColors } from '../theme/colors';

export const widgetName = 'RoutineLogToday';
export const widgetClickSchema = z.object({
  routineId: z.string().min(1),
  date: z.iso.date(),
  expectedStatus: z.enum(['pending', 'done', 'missed', 'skipped']),
});
export type WidgetClick = z.infer<typeof widgetClickSchema>;
export interface WidgetRoutine {
  id: string;
  name: string;
  icon: string;
  time: string;
  status: OccurrenceStatus;
  color: `#${string}`;
  requiresChecklist: boolean;
  click: WidgetClick;
  checklistUrl: string;
}
export function todayWidgetModel(
  routines: Routine[],
  logs: RoutineLog[],
  now = new Date(),
) {
  const date = localDate(now);
  const items: WidgetRoutine[] = occurrencesForDate(
    routines,
    logs,
    date,
    now,
  ).map((occurrence) => {
    const routine = occurrence.routine;
    const status = occurrence.log?.status ?? 'pending';
    return {
      id: routine.id,
      name: routine.name,
      icon: routine.icon,
      time: routine.reminderTime,
      status,
      color: categoryColors[routine.category],
      requiresChecklist:
        nextStatus(status) === 'done' && Boolean(routine.checklist?.length),
      click: { routineId: routine.id, date, expectedStatus: status },
      checklistUrl: `routinelog://widget-action?routineId=${encodeURIComponent(routine.id)}&date=${date}&expectedStatus=${status}`,
    };
  });
  return {
    date,
    label: dateLabel(date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    items,
    done: items.filter((item) => item.status === 'done').length,
  };
}
export type TodayWidgetModel = ReturnType<typeof todayWidgetModel>;
