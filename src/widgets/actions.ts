import type { RoutineState } from '../store/createRoutineStore';
import { localDate } from '../domain/dates';
import { occurrencesForDate } from '../domain/schedule';
import { nextStatus } from '../domain/status';
import { widgetClickSchema } from './model';

type WidgetStore = Pick<
  RoutineState,
  'ready' | 'saving' | 'routines' | 'logs' | 'setStatus'
>;
export async function cycleFromWidget(
  state: WidgetStore,
  payload: unknown,
  now = new Date(),
): Promise<'saved' | 'stale' | 'busy' | 'unavailable' | 'checklist' | 'error'> {
  const parsed = widgetClickSchema.safeParse(payload);
  if (!parsed.success || parsed.data.date !== localDate(now)) return 'stale';
  if (!state.ready || state.saving) return 'busy';
  const { routineId, date, expectedStatus } = parsed.data;
  const occurrence = occurrencesForDate(
    state.routines,
    state.logs,
    date,
    now,
  ).find((item) => item.routine.id === routineId);
  if (!occurrence) return 'unavailable';
  const current = occurrence.log?.status ?? 'pending';
  // Multiple widget instances and rapid taps can still carry a previous view.
  if (current !== expectedStatus) return 'stale';
  const next = nextStatus(current);
  if (next === 'done' && occurrence.routine.checklist?.length)
    return 'checklist';
  return (await state.setStatus(routineId, date, next)) ? 'saved' : 'error';
}
