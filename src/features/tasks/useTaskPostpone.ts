import { create } from 'zustand';
import type { DailyTask } from '../../domain/task';
import { routineStore } from '../../store/useRoutines';

export const useTaskPostpone = create<{
  undo: { task: DailyTask; from: string } | null;
  postpone(id: string, date: string): Promise<boolean>;
  restore(): Promise<void>;
}>((set) => ({
  undo: null,
  postpone: async (id, date) => {
    if (!(await routineStore.getState().postponeTask(id, date))) return false;
    const task = routineStore.getState().tasks.find((item) => item.id === id)!;
    set({ undo: { task, from: date } });
    return true;
  },
  restore: async () => {
    const undo = useTaskPostpone.getState().undo;
    if (
      undo &&
      (await routineStore.getState().undoTaskPostpone(undo.task, undo.from))
    )
      set({ undo: null });
  },
}));
