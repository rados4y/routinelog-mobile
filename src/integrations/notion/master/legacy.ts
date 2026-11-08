import type { KeyValueStorage } from '../../../data/repositories';
import { addDays } from '../../../domain/dates';
import { routineInputSchema } from '../../../domain/models';
import { createRoutine, updateRoutine } from '../../../domain/routine';
import {
  columnName,
  inputFromColumn,
  linkedRoutineId,
  supportedColumn,
} from '../descriptions';
import {
  equal,
  mergeValue,
  monthLedgerSchema,
  type ConflictChoice,
  type MonthRef,
  type NotionGateway,
  type SyncLocal,
} from '../models';

// One-time, resumable import. Missing monthly columns never delete a definition.
// Only the last/current month's schema may update an existing routine; older
// columns recover historical-only records without overwriting current settings.
export async function importLegacyRoutines(
  root: string,
  refs: MonthRef[],
  current: string,
  remote: NotionGateway,
  local: SyncLocal,
  storage: KeyValueStorage,
  clock: () => Date,
  choice?: ConflictChoice,
): Promise<void> {
  const sorted = refs
    .filter((ref) => ref.databaseId && ref.month <= current)
    .sort((a, b) => b.month.localeCompare(a.month));
  for (const [index, ref] of sorted.entries()) {
    const table = await remote.readMonth(ref);
    const raw = await storage.getItem(
      `@routinelog/notion/v1/${root}/${ref.month}`,
    );
    const ledger = raw ? monthLedgerSchema.parse(JSON.parse(raw)) : undefined;
    if (ledger && ledger.databaseId !== ref.databaseId)
      throw new Error(
        `The ${ref.month} table was replaced. Restore the original before migration.`,
      );
    for (const column of table.columns.filter(supportedColumn)) {
      const binding = ledger?.bindings.find(
        (item) => item.propertyId === column.id,
      );
      const linked = binding?.routineId ?? linkedRoutineId(column);
      const routines = local.read().routines;
      let routine = routines.find((item) => item.id === linked);
      if (!routine && !linked)
        routine = routines.find(
          (item) =>
            !item.deletedAt &&
            (columnName(item) === column.name || item.name === column.name),
        );
      const id =
        routine?.id ??
        linked ??
        `notion-${ref.databaseId}-${encodeURIComponent(column.id)}`;
      if (!routine) {
        const created = createRoutine(inputFromColumn(column), id, clock());
        if (index > 0) {
          created.active = false;
          created.effectiveFrom = `${ref.month}-01`;
          created.deletedAt = `${addDays(`${ref.month}-28`, 4).slice(0, 7)}-01T00:00:00.000Z`;
        }
        if (!(await local.applyRoutine(undefined, created)))
          throw new Error(
            'A routine changed during migration. Sync again; newer edits are safe.',
          );
        routine = created;
      } else if (index === 0 && !routine.deletedAt) {
        const input = routineInputSchema.parse(routine);
        const fromColumn = inputFromColumn(column, binding?.base ?? input);
        const merged = { ...input };
        for (const field of Object.keys(input) as (keyof typeof input)[]) {
          if (
            field === 'checklist' ||
            field === 'startDate' ||
            field === 'endDate'
          )
            continue;
          Object.assign(merged, {
            [field]: mergeValue(
              binding?.base[field],
              input[field],
              fromColumn[field],
              `${routine.name}: ${field}`,
              choice,
            ),
          });
        }
        if (
          !equal(input, merged) &&
          !(await local.applyRoutine(
            routine,
            updateRoutine(routine, merged, clock()),
          ))
        )
          throw new Error(
            'A routine changed during migration. Sync again; newer edits are safe.',
          );
      }
    }
  }
}
