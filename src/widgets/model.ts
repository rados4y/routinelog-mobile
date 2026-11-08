import { z } from 'zod';
import { addDays, localDate, dateLabel } from '../domain/dates';
import type { Routine, RoutineLog, OccurrenceStatus } from '../domain/models';
import { occurrencesForDate } from '../domain/schedule';
import { nextStatus } from '../domain/status';
import { categoryColors } from '../theme/colors';
import type { DailyNote } from '../domain/note';
import { widgetFocusUrl } from './focus';

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
  openUrl: string;
}
export function todayWidgetModel(
  routines: Routine[],
  logs: RoutineLog[],
  now = new Date(),
  date = localDate(now),
  notes: readonly Pick<DailyNote, 'date' | 'content'>[] = [],
) {
  const today = localDate(now);
  const isToday = date === today;
  const items: WidgetRoutine[] = occurrencesForDate(
    routines,
    logs,
    date,
    now,
  ).map((occurrence) => {
    const routine = occurrence.routine;
    const status =
      occurrence.log?.status ??
      (date < today && occurrence.status === 'missed' ? 'missed' : 'pending');
    return {
      id: routine.id,
      name: routine.name,
      icon: routine.icon,
      time: routine.reminderTime,
      status,
      color: categoryColors[routine.category],
      requiresChecklist:
        isToday &&
        nextStatus(status) === 'done' &&
        Boolean(routine.checklist?.length),
      click: { routineId: routine.id, date, expectedStatus: status },
      checklistUrl: `routinelog://widget-action?routineId=${encodeURIComponent(routine.id)}&date=${date}&expectedStatus=${status}`,
      openUrl: widgetFocusUrl({
        focus: 'routine',
        date,
        routineId: routine.id,
      }),
    };
  });
  return {
    date,
    isToday,
    title: isToday
      ? 'Today'
      : date === addDays(today, -1)
        ? 'Yesterday'
        : date === addDays(today, 1)
          ? 'Tomorrow'
          : dateLabel(date, { day: 'numeric', month: 'short' }),
    navigation: { date, viewedOn: today },
    label: dateLabel(date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    items,
    note: {
      preview: Array.from(
        notes
          .find((note) => note.date === date)
          ?.content.trim()
          .replace(/\s+/g, ' ') ?? '',
      )
        .slice(0, 240)
        .join(''),
      openUrl: widgetFocusUrl({ focus: 'note', date }),
    },
    done: items.filter((item) => item.status === 'done').length,
  };
}
export type TodayWidgetModel = ReturnType<typeof todayWidgetModel>;
