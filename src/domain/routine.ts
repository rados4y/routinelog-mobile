import { localDate } from './dates';
import { routineInputSchema, type Routine, type RoutineInput } from './models';

export function createRoutine(
  input: RoutineInput,
  id: string,
  now = new Date(),
): Routine {
  return {
    ...routineInputSchema.parse(input),
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    effectiveFrom:
      input.startDate && input.startDate < localDate(now)
        ? input.startDate
        : localDate(now),
    deletedAt: null,
    sortOrder: now.getTime(),
    revisions: [],
  };
}
export function updateRoutine(
  routine: Routine,
  input: RoutineInput,
  now = new Date(),
): Routine {
  const data = routineInputSchema.parse(input);
  const date = localDate(now);
  const revisions =
    routine.effectiveFrom < date
      ? [
          ...routine.revisions,
          {
            from: routine.effectiveFrom,
            until: date,
            data: routineInputSchema.parse(routine),
          },
        ]
      : routine.revisions;
  return {
    ...routine,
    ...data,
    revisions,
    effectiveFrom: date,
    updatedAt: now.toISOString(),
  };
}
// Legacy records have no explicit range; their first schedule revision is the start.
export const routineStartDate = (routine: Routine): string =>
  routine.startDate ?? routine.revisions[0]?.from ?? routine.effectiveFrom;
export function inRoutineRange(routine: Routine, date: string): boolean {
  return (
    date >= routineStartDate(routine) &&
    (!routine.endDate || date <= routine.endDate)
  );
}
export function routineOn(routine: Routine, date: string): Routine | undefined {
  if (!inRoutineRange(routine, date)) return undefined;
  if (date >= routine.effectiveFrom) return routine;
  const revision = routine.revisions.find(
    (item) => date >= item.from && date < item.until,
  );
  return revision
    ? { ...routine, ...revision.data, checklist: revision.data.checklist }
    : routine.startDate && date >= routine.startDate
      ? routine
      : undefined;
}
