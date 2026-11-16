import type { Repositories } from '../data/repositories';
import { addDays, localDate } from '../domain/dates';
import { EntryUnavailableError } from '../domain/entry';
import { createTask, taskSchema, type DailyTask } from '../domain/task';
import type { RoutineState } from './createRoutineStore';

export interface TaskActions {
  tasks: DailyTask[];
  saveTask(date: string, description: string, id?: string): Promise<boolean>;
  setTaskDone(id: string, done: boolean): Promise<boolean>;
  deleteTask(id: string): Promise<boolean>;
  postponeTask(id: string, expectedDate: string): Promise<boolean>;
  undoTaskPostpone(expected: DailyTask, originalDate: string): Promise<boolean>;
  applySyncedTask(
    expected: DailyTask | undefined,
    next: DailyTask,
  ): Promise<boolean>;
}

export function taskActions(
  get: () => RoutineState,
  set: (state: Partial<RoutineState>) => void,
  perform: (work: () => Promise<void>) => Promise<boolean>,
  repos: Repositories,
  clock: () => Date,
  nextId: () => string,
): TaskActions {
  const find = (id: string) => {
    const task = get().tasks.find((item) => item.id === id && !item.deletedAt);
    if (!task) throw new Error('Task is no longer available.');
    return task;
  };
  const save = async (task: DailyTask) => {
    await repos.tasks.save(taskSchema.parse(task));
    set({
      tasks: [...get().tasks.filter((item) => item.id !== task.id), task],
    });
  };
  return {
    tasks: [],
    postponeTask: (id, expectedDate) =>
      perform(async () => {
        const task = find(id);
        if (task.done || task.date !== expectedDate)
          throw new EntryUnavailableError(
            'Task changed. Review it before postponing.',
          );
        await save(
          taskSchema.parse({
            ...task,
            date: addDays(task.date, 1),
            updatedAt: clock().toISOString(),
          }),
        );
      }),
    undoTaskPostpone: (expected, originalDate) =>
      perform(async () => {
        const task = find(expected.id);
        if (
          JSON.stringify(task) !== JSON.stringify(expected) ||
          task.done ||
          addDays(originalDate, 1) !== task.date
        )
          throw new EntryUnavailableError(
            'Task changed since postponing. Review its assigned date.',
          );
        await save({
          ...task,
          date: originalDate,
          updatedAt: clock().toISOString(),
        });
      }),
    saveTask: (date, description, id) =>
      perform(async () => {
        if (id) {
          const previous = find(id);
          await save(
            taskSchema.parse({
              ...previous,
              description,
              updatedAt: clock().toISOString(),
            }),
          );
        } else {
          if (date < localDate(clock()))
            throw new EntryUnavailableError(
              'Select today or a future day to add a task.',
            );
          await save(
            createTask(`task-${nextId()}`, date, description, clock()),
          );
        }
      }),
    setTaskDone: (id, done) =>
      perform(async () => {
        const task = find(id);
        if (task.date > localDate(clock()))
          throw new EntryUnavailableError(
            'Future task — complete it on that day or later.',
          );
        await save({ ...task, done, updatedAt: clock().toISOString() });
      }),
    deleteTask: (id) =>
      perform(async () => {
        const task = find(id);
        await save({
          ...task,
          deletedAt: clock().toISOString(),
          updatedAt: clock().toISOString(),
        });
      }),
    applySyncedTask: (expected, next) => {
      if (
        JSON.stringify(get().tasks.find((item) => item.id === next.id)) !==
        JSON.stringify(expected)
      )
        return Promise.resolve(false);
      return perform(() => save(next));
    },
  };
}
