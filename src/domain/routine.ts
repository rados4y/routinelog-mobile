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
    effectiveFrom: localDate(now),
    deletedAt: null,
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
export function routineOn(routine: Routine, date: string): Routine | undefined {
  if (date >= routine.effectiveFrom) return routine;
  const revision = routine.revisions.find(
    (item) => date >= item.from && date < item.until,
  );
  return revision ? { ...routine, ...revision.data } : undefined;
}
