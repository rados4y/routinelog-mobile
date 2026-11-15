import { z } from 'zod';
import { dateSchema } from './models';

export const maxTaskLength = 2000;
export const taskSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  description: z.string().trim().min(1).max(maxTaskLength),
  done: z.boolean(),
  deletedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type DailyTask = z.infer<typeof taskSchema>;

export function tasksForDate(tasks: readonly DailyTask[], date: string) {
  return tasks
    .filter((task) => task.date === date && !task.deletedAt)
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
}

export function createTask(
  id: string,
  date: string,
  description: string,
  now = new Date(),
): DailyTask {
  return taskSchema.parse({
    id,
    date,
    description,
    done: false,
    deletedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}
