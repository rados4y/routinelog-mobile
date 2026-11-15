import { z } from 'zod';
import { dateSchema } from '../../../domain/models';
import { maxTaskLength } from '../../../domain/task';

export const taskValueSchema = z.object({
  date: dateSchema,
  description: z.string().trim().min(1).max(maxTaskLength),
  done: z.boolean(),
  archived: z.boolean(),
});
export type TaskValue = z.infer<typeof taskValueSchema>;
export interface TaskTable {
  databaseId: string;
  dataSourceId: string;
  rows: {
    id: string;
    pageId: string;
    value: TaskValue;
    createdAt: string;
    updatedAt: string;
    needsWrite?: boolean;
  }[];
}
export interface TaskGateway {
  readTasks(): Promise<TaskTable>;
  writeTask(
    table: TaskTable,
    id: string,
    value: TaskValue,
    pageId?: string,
  ): Promise<string>;
}
export const taskLedgerSchema = z.object({
  version: z.literal(1),
  databaseId: z.string(),
  bindings: z.record(
    z.string(),
    z.object({ pageId: z.string(), base: taskValueSchema }),
  ),
});
