import type { KeyValueStorage } from '../../../data/repositories';
import type { SyncLocal } from '../../../data/sync';
import { localDate } from '../../../domain/dates';
import { taskSchema, type DailyTask } from '../../../domain/task';
import { equal, mergeValue, type ConflictChoice } from '../models';
import { taskLedgerSchema, type TaskGateway, type TaskValue } from './models';

const taskValue = (task: DailyTask): TaskValue => ({
  date: task.date,
  description: task.description,
  done: task.done,
  archived: Boolean(task.deletedAt),
});
export async function syncTasks(
  root: string,
  remote: TaskGateway,
  local: SyncLocal,
  storage: KeyValueStorage,
  clock: () => Date,
  choice?: ConflictChoice,
) {
  const table = await remote.readTasks();
  const key = `@routinelog/notion/v1/${root}/tasks`;
  const raw = await storage.getItem(key);
  const ledger = raw
    ? taskLedgerSchema.parse(JSON.parse(raw))
    : {
        version: 1 as const,
        databaseId: table.databaseId,
        bindings: {} as Record<string, { pageId: string; base: TaskValue }>,
      };
  if (ledger.databaseId !== table.databaseId)
    throw new Error(
      'The Tasks database was replaced. Restore the original database before syncing. Local tasks are safe.',
    );
  const ids = new Set([
    ...local.read().tasks.map((task) => task.id),
    ...table.rows.map((row) => row.id),
  ]);
  for (const id of ids) {
    const task = local.read().tasks.find((item) => item.id === id);
    const row = table.rows.find((item) => item.id === id);
    const binding = ledger.bindings[id];
    if (
      !row &&
      binding &&
      table.rows.some((item) => item.pageId === binding.pageId)
    )
      throw new Error('Task ID changed in Notion. Restore it before syncing.');
    const current = task ? taskValue(task) : undefined;
    // Only absence from a complete, validated listing can mean remote deletion.
    const remoteValue =
      row?.value ?? (binding ? { ...binding.base, archived: true } : undefined);
    let merged = current ?? remoteValue;
    if (!merged) continue;
    if (current && remoteValue) {
      merged = { ...current };
      for (const field of Object.keys(current) as (keyof TaskValue)[])
        Object.assign(merged, {
          [field]: mergeValue(
            binding?.base[field],
            current[field],
            remoteValue[field],
            `Task: ${current.description} · ${field}`,
            choice,
          ),
        });
    }
    if (merged.done && !merged.archived && merged.date > localDate(clock()))
      throw new Error(
        'A future task is checked in Notion. Uncheck Done until its scheduled day. Local tasks are safe.',
      );
    let pageId = row?.pageId;
    if (!pageId || !equal(merged, remoteValue) || row?.needsWrite)
      pageId = await remote.writeTask(table, id, merged, pageId);
    if (!current || !equal(current, merged)) {
      const next = taskSchema.parse({
        id,
        ...merged,
        deletedAt: merged.archived
          ? (task?.deletedAt ?? clock().toISOString())
          : null,
        createdAt: task?.createdAt ?? row?.createdAt ?? clock().toISOString(),
        updatedAt: clock().toISOString(),
      });
      if (!(await local.applyTask(task, next)))
        throw new Error(
          'A task changed during sync. The newer local edit was kept. Sync again.',
        );
    }
    ledger.bindings[id] = { pageId: pageId!, base: merged };
    await storage.setItem(key, JSON.stringify(ledger));
  }
}
