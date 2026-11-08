import { syncMasterRoutines } from './master/sync';
import { importLegacyRoutines } from './master/legacy';
import type { KeyValueStorage } from '../../data/repositories';
import { addDays, localDate } from '../../domain/dates';
import {
  routineInputSchema,
  type Routine,
  type RoutineLog,
} from '../../domain/models';
import { routineOn, routineStartDate } from '../../domain/routine';
import {
  cellWrite,
  columnName,
  linkedRoutineId,
  newColumn,
  observableStatus,
  supportedColumn,
} from './descriptions';
import {
  mergeValue,
  monthLedgerSchema,
  type CellStatus,
  type ConflictChoice,
  type MonthLedger,
  type MonthRef,
  type MonthTable,
  type NotionGateway,
  type SyncLocal,
} from './models';
import { ensureNotesColumn, syncDailyNotes } from './dailyNotes';

export function daysInMonth(month: string): string[] {
  const days: string[] = [];
  for (
    let day = `${month}-01`;
    day.startsWith(`${month}-`);
    day = addDays(day, 1)
  )
    days.push(day);
  return days;
}
const logStatus = (log: RoutineLog | undefined): CellStatus =>
  log?.status ?? 'pending';
const ledgerKey = (root: string, month: string) =>
  `@routinelog/notion/v1/${root}/${month}`;
const changedDuringSync = () =>
  new Error(
    'Newer local changes were saved during sync. They have been kept. Sync again.',
  );
function projectedColumnName(
  routine: Routine,
  table: MonthTable,
  propertyId?: string,
): string {
  const base = columnName(routine);
  if (
    !table.columns.some((item) => item.id !== propertyId && item.name === base)
  )
    return base;
  let hash = 2166136261;
  for (const char of routine.id)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${base} · ${(hash >>> 0).toString(36)}`;
}

export class NotionSync {
  private pendingChecklists = new Set<string>();
  constructor(
    private root: string,
    private remote: NotionGateway,
    private local: SyncLocal,
    private storage: KeyValueStorage,
    private clock = () => new Date(),
  ) {}
  async run(choice?: ConflictChoice): Promise<void> {
    this.pendingChecklists.clear();
    const current = localDate(this.clock()).slice(0, 7);
    const refs = await this.remote.listMonths();
    await syncMasterRoutines(
      this.root,
      this.remote,
      this.local,
      this.storage,
      this.clock,
      () =>
        importLegacyRoutines(
          this.root,
          refs,
          current,
          this.remote,
          this.local,
          this.storage,
          this.clock,
          choice,
        ),
      choice,
    );
    if (!refs.some((ref) => ref.month === current && ref.databaseId)) {
      const partial = refs.findIndex((ref) => ref.month === current);
      if (partial !== -1) refs.splice(partial, 1);
      refs.push(await this.remote.createMonth(current));
    }
    const data = this.local.read();
    for (const month of new Set([
      ...data.logs.map((log) => log.scheduledFor.slice(0, 7)),
      ...data.notes.map((note) => note.date.slice(0, 7)),
    ])) {
      if (refs.some((ref) => ref.month === month && ref.databaseId)) continue;
      const partial = refs.findIndex((ref) => ref.month === month);
      if (partial !== -1) refs.splice(partial, 1);
      refs.push(await this.remote.createMonth(month));
    }
    for (const ref of refs
      .filter((ref) => ref.databaseId)
      .sort((a, b) => b.month.localeCompare(a.month)))
      await this.month(ref, current, choice);
    if (this.pendingChecklists.size)
      throw new Error(
        `Confirm the checklist in the app for: ${[...this.pendingChecklists].slice(0, 3).join(', ')}${this.pendingChecklists.size > 3 ? '…' : ''}. These Notion completions are awaiting confirmation. Other changes have synced.`,
      );
  }
  private async month(
    ref: MonthRef,
    current: string,
    choice?: ConflictChoice,
  ): Promise<void> {
    const raw = await this.storage.getItem(ledgerKey(this.root, ref.month));
    const ledger: MonthLedger = raw
      ? monthLedgerSchema.parse(JSON.parse(raw))
      : {
          version: 1,
          databaseId: ref.databaseId,
          bindings: [],
          cells: {},
          notes: {},
        };
    if (ledger.databaseId !== ref.databaseId)
      throw new Error(
        `The ${ref.month} table was replaced. Restore the original table before syncing.`,
      );
    const persist = () =>
      this.storage.setItem(
        ledgerKey(this.root, ref.month),
        JSON.stringify(ledger),
      );
    let table = await this.remote.readMonth({
      ...ref,
      notesPropertyId: ledger.notesPropertyId,
    });
    table = await ensureNotesColumn(table, ledger, this.remote, persist);
    // Columns are projections, never routine definitions after migration.
    for (const column of table.columns) {
      const binding = ledger.bindings.find(
        (item) => item.propertyId === column.id,
      );
      if (binding && !supportedColumn(column))
        throw new Error(
          `Column “${column.name}” changed type. Restore select, checkbox or text. Your data remains saved.`,
        );
      if (!supportedColumn(column) || binding) continue;
      const linkedId = linkedRoutineId(column);
      const routines = this.local.read().routines;
      const routine =
        routines.find(
          (item) =>
            item.id === linkedId ||
            item.id ===
              `notion-${ref.databaseId}-${encodeURIComponent(column.id)}`,
        ) ??
        (!linkedId
          ? routines.find(
              (item) =>
                columnName(item) === column.name || item.name === column.name,
            )
          : undefined);
      if (routine)
        ledger.bindings.push({
          propertyId: column.id,
          routineId: routine.id,
          base: routineInputSchema.parse(routine),
        });
    }
    const end = daysInMonth(ref.month).at(-1)!;
    const data = this.local.read();
    for (const routine of data.routines) {
      let binding = ledger.bindings.find(
        (item) =>
          item.routineId === routine.id &&
          table.columns.some((col) => col.id === item.propertyId),
      );
      const hasLogs = data.logs.some(
        (log) =>
          log.routineId === routine.id &&
          log.scheduledFor.startsWith(`${ref.month}-`),
      );
      const rangeEnd = routine.endDate ?? '9999-12-31';
      const retirement = routine.deletedAt?.slice(0, 10) ?? '9999-12-31';
      const overlaps =
        routineStartDate(routine) <= end &&
        rangeEnd >= `${ref.month}-01` &&
        retirement >= `${ref.month}-01`;
      // Preserve all existing columns. Add current/future definitions by date range;
      // add missing historical columns only for actual recorded results.
      if (!binding && !(hasLogs || (ref.month >= current && overlaps)))
        continue;
      const name = projectedColumnName(routine, table, binding?.propertyId);
      const description = `RoutineLog routine (v2)\nSettings: Routines database\nLink: routinelog://routine-editor?id=${encodeURIComponent(routine.id)}`;
      if (!binding) {
        // New/recreated empty columns cannot mean a mass undo of local statuses.
        for (const id of Object.keys(ledger.cells))
          if (id.startsWith(`${routine.id}:`)) delete ledger.cells[id];
        await persist();
        table = await this.remote.updateColumns(table, {
          [name]: { ...newColumn(routine), description },
        });
        const column = table.columns.find(
          (item) =>
            linkedRoutineId(item) === routine.id &&
            !ledger.bindings.some((old) => old.propertyId === item.id),
        );
        if (!column)
          throw new Error(
            'Could not link the generated monthly column. Try again.',
          );
        binding = {
          propertyId: column.id,
          routineId: routine.id,
          base: routineInputSchema.parse(routine),
        };
        ledger.bindings.push(binding);
      } else if (ref.month >= current) {
        const column = table.columns.find(
          (item) => item.id === binding!.propertyId,
        )!;
        if (column.name !== name || column.description !== description)
          table = await this.remote.updateColumns(table, {
            [column.id]: { name, description },
          });
      }
    }
    await persist();
    table = await this.ensureDays(table, ledger, persist);
    await this.syncCells(table, ledger, persist, choice);
    await syncDailyNotes(
      table,
      ledger,
      this.remote,
      this.local,
      persist,
      this.clock,
      choice,
    );
  }
  private async ensureDays(
    table: MonthTable,
    ledger: MonthLedger,
    persist: () => Promise<void>,
  ): Promise<MonthTable> {
    let createdDays = false;
    for (const date of daysInMonth(table.month)) {
      if (table.rows.some((row) => row.date === date)) continue;
      // A recreated day should get the local entries, rather than act as an undo of every cell.
      // Record this intent before the request: its response may be lost after Notion saves the row.
      for (const id of Object.keys(ledger.cells))
        if (id.endsWith(`:${date}`)) delete ledger.cells[id];
      delete ledger.notes[date];
      await persist();
      await this.remote.createDay(table, date);
      createdDays = true;
    }
    return createdDays ? this.remote.readMonth(table) : table;
  }
  private async syncCells(
    table: MonthTable,
    ledger: MonthLedger,
    persist: () => Promise<void>,
    choice?: ConflictChoice,
  ): Promise<void> {
    for (const row of table.rows) {
      if (row.date > localDate(this.clock())) continue;
      const writes: Record<string, unknown> = {};
      const pulls: {
        expected: RoutineLog | undefined;
        next: RoutineLog | undefined;
        id: string;
      }[] = [];
      const bases: Record<string, CellStatus> = {};
      for (const binding of ledger.bindings) {
        const column = table.columns.find(
          (item) => item.id === binding.propertyId,
        );
        if (!column || !supportedColumn(column)) continue;
        const { routines, logs } = this.local.read();
        const routine = routines.find((item) => item.id === binding.routineId);
        if (!routine) continue;
        const id = `${routine.id}:${row.date}`;
        const existing = logs.find((log) => log.id === id);
        const localStatus = observableStatus(column, logStatus(existing));
        const remoteStatus = row.cells[column.id];
        if (remoteStatus === undefined)
          throw new Error('Incomplete Notion data. Try again.');
        const merged = mergeValue(
          ledger.cells[id],
          localStatus,
          remoteStatus,
          `${routine.name} · ${row.date}`,
          choice,
        );
        if (
          merged === 'done' &&
          existing?.status !== 'done' &&
          (routineOn(routine, row.date) ?? routine).checklist?.length
        ) {
          this.pendingChecklists.add(`${routine.name} · ${row.date}`);
          continue;
        }
        if (merged !== remoteStatus)
          writes[column.id] = cellWrite(column, merged);
        if (merged !== localStatus) {
          const now = this.clock().toISOString();
          pulls.push({
            id,
            expected: existing,
            next:
              merged === 'pending'
                ? undefined
                : {
                    id,
                    routineId: routine.id,
                    scheduledFor: row.date,
                    status: merged,
                    completedAt: merged === 'done' ? row.editedAt : null,
                    value: existing?.value ?? null,
                    note: existing?.note ?? '',
                    source: 'notion',
                    createdAt: existing?.createdAt ?? now,
                    updatedAt: now,
                    routineName:
                      existing?.routineName ??
                      (routineOn(routine, row.date) ?? routine).name,
                    routineIcon:
                      existing?.routineIcon ??
                      (routineOn(routine, row.date) ?? routine).icon,
                  },
          });
        }
        bases[id] = merged;
      }
      if (Object.keys(writes).length)
        await this.remote.writeCells(row.id, writes);
      for (const pull of pulls)
        if (!(await this.local.applyLog(pull.expected, pull.next, pull.id)))
          throw changedDuringSync();
      Object.assign(ledger.cells, bases);
      await persist();
    }
  }
}
