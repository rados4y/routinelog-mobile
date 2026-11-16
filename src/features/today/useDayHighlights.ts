import { useMemo } from 'react';
import { useRoutines } from '../../store/useRoutines';
import { useNoteDates } from '../notes/useNoteDates';
import { taskHighlights } from '../../domain/task';

export function useDayHighlights(today: string) {
  const tasks = useRoutines((state) => state.tasks);
  const noteDates = useNoteDates();
  return useMemo(
    () => ({ noteDates, ...taskHighlights(tasks, today) }),
    [tasks, today, noteDates],
  );
}
