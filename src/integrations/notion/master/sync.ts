import type { KeyValueStorage } from '../../../data/repositories';
import type { Routine } from '../../../domain/models';
import {
  createRoutine,
  routineStartDate,
  updateRoutine,
} from '../../../domain/routine';
import {
  equal,
  mergeValue,
  type ConflictChoice,
  type NotionGateway,
  type SyncLocal,
} from '../models';
import {
  masterLedgerSchema,
  masterValueSchema,
  type MasterValue,
} from './models';

export function valueFromRoutine(routine: Routine): MasterValue {
  return masterValueSchema.parse({
    ...routine,
    startDate: routineStartDate(routine),
    endDate: routine.endDate ?? null,
    checklist: routine.checklist ?? [],
    archived: Boolean(routine.deletedAt),
  });
}
function alignChecklist(
  value: MasterValue,
  reference: MasterValue | undefined,
): MasterValue {
  const used = new Set<string>();
  return {
    ...value,
    checklist: value.checklist.map((step, index) => {
      const match =
        reference?.checklist.find(
          (item) => item.text === step.text && !used.has(item.id),
        ) ?? reference?.checklist[index];
      const id = match && !used.has(match.id) ? match.id : step.id;
      used.add(id);
      return { ...step, id };
    }),
  };
}
export async function syncMasterRoutines(
  root: string,
  remote: NotionGateway,
  local: SyncLocal,
  storage: KeyValueStorage,
  clock: () => Date,
  bootstrap: () => Promise<void>,
  choice?: ConflictChoice,
): Promise<void> {
  const table = await remote.readRoutines();
  const key = `@routinelog/notion/v2/${root}/routines`;
  const raw = await storage.getItem(key);
  const ledger = raw
    ? masterLedgerSchema.parse(JSON.parse(raw))
    : {
        version: 2 as const,
        databaseId: table.databaseId,
        bindings: {} as Record<string, { pageId: string; base: MasterValue }>,
      };
  if (ledger.databaseId !== table.databaseId)
    throw new Error(
      'The Routines database was replaced. Restore the original database before syncing; your local data is safe.',
    );
  if (!table.initialized) await bootstrap();
  const persist = () => storage.setItem(key, JSON.stringify(ledger));
  // A fully paginated snapshot is required before an absent, previously known row
  // can mean retirement. Keep a visible archived row as a cross-device tombstone.
  for (const [id, binding] of Object.entries(ledger.bindings)) {
    if (table.rows.some((row) => row.routineId === id)) continue;
    if (table.rows.some((row) => row.pageId === binding.pageId))
      throw new Error(
        'Routine ID was changed in Notion. Restore it before syncing; no routine was removed.',
      );
    const routine = local.read().routines.find((item) => item.id === id);
    if (!routine) continue;
    const current = valueFromRoutine(routine);
    const retired = { ...current, active: false, archived: true };
    const pageId = await remote.writeRoutine(table, id, retired);
    if (
      !routine.deletedAt &&
      !(await local.applyRoutine(routine, {
        ...updateRoutine(routine, retired, clock()),
        deletedAt: clock().toISOString(),
      }))
    )
      throw new Error(
        'A routine changed during sync. The newer local edit was kept. Sync again.',
      );
    ledger.bindings[id] = { pageId, base: retired };
    // Include the newly written row in this pass so it is never created twice.
    table.rows.push({
      pageId,
      routineId: id,
      input: retired,
      archived: true,
      createdDate: retired.startDate,
    });
    await persist();
  }
  const ids = new Set([
    ...local.read().routines.map((item) => item.id),
    ...table.rows.map((row) => row.routineId),
  ]);
  for (const id of ids) {
    const routine = local.read().routines.find((item) => item.id === id);
    const row = table.rows.find((item) => item.routineId === id);
    const binding = ledger.bindings[id];
    const current = routine ? valueFromRoutine(routine) : undefined;
    const remoteValue = row
      ? alignChecklist(
          masterValueSchema.parse({
            ...row.input,
            startDate:
              row.input.startDate ?? current?.startDate ?? row.createdDate,
            endDate: row.input.endDate ?? null,
            checklist: row.input.checklist ?? [],
            archived: row.archived,
          }),
          binding?.base ?? current,
        )
      : undefined;
    let merged = current ?? remoteValue;
    if (!merged) continue;
    if (current && remoteValue) {
      merged = { ...current };
      for (const field of Object.keys(current) as (keyof MasterValue)[]) {
        Object.assign(merged, {
          [field]: mergeValue(
            binding?.base[field],
            current[field],
            remoteValue[field],
            `${routine!.name}: ${field}`,
            choice,
          ),
        });
      }
    }
    // Archive is a durable explicit retirement, regardless of the Active toggle.
    if (merged.archived) merged.active = false;
    if (merged.endDate && merged.endDate < merged.startDate)
      throw new Error(
        `End date precedes Start date for ${merged.name}. Fix the date range before syncing.`,
      );
    const valid = masterValueSchema.parse(merged);
    let pageId = row?.pageId;
    if (
      !pageId ||
      !equal(valid, remoteValue) ||
      !row?.input.startDate ||
      row.needsIdentityWrite
    )
      pageId = await remote.writeRoutine(table, id, valid, pageId);
    if (!current || !equal(current, valid)) {
      const next = routine
        ? updateRoutine(routine, valid, clock())
        : createRoutine(valid, id, clock());
      next.deletedAt = valid.archived
        ? (routine?.deletedAt ?? clock().toISOString())
        : null;
      if (!(await local.applyRoutine(routine, next)))
        throw new Error(
          'A routine changed during sync. The newer local edit was kept. Sync again.',
        );
    }
    ledger.bindings[id] = { pageId: pageId!, base: valid };
    await persist();
  }
  if (!table.initialized) await remote.finishRoutineMigration(table);
}
