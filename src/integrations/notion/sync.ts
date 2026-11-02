import type { KeyValueStorage } from '../../data/repositories';
import { addDays, localDate } from '../../domain/dates';
import { routineInputSchema, type RoutineLog } from '../../domain/models';
import { createRoutine, routineOn, updateRoutine } from '../../domain/routine';
import {
  cellWrite,
  columnName,
  descriptionFor,
  inputFromColumn,
  linkedRoutineId,
  newColumn,
  observableStatus,
  supportedColumn,
} from './descriptions';
import {
  equal,
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
    'W trakcie synchronizacji zapisano nowsze zmiany w aplikacji. Zachowaliśmy je. Synchronizuj ponownie.',
  );
const fieldLabels = {
  name: 'Nazwa',
  icon: 'Ikona',
  category: 'Kategoria',
  active: 'Aktywność',
  schedule: 'Harmonogram',
  target: 'Cel',
  unit: 'Jednostka',
  reminderTime: 'Godzina',
  note: 'Opis',
  checklist: 'Lista kroków',
};

export class NotionSync {
  private pendingChecklists = new Set<string>();
  private awaitingRoutineIds = new Set<string>();
  private blockedRetirement = false;
  constructor(
    private root: string,
    private remote: NotionGateway,
    private local: SyncLocal,
    private storage: KeyValueStorage,
    private clock = () => new Date(),
  ) {}
  async run(choice?: ConflictChoice): Promise<void> {
    this.pendingChecklists.clear();
    this.awaitingRoutineIds.clear();
    this.blockedRetirement = false;
    const current = localDate(this.clock()).slice(0, 7);
    const refs = await this.remote.listMonths();
    const authority = refs
      .filter((ref) => ref.month <= current)
      .sort((a, b) => b.month.localeCompare(a.month))[0];
    // Before rolling over, import the last month's schema once, then freeze that archive.
    if (authority?.databaseId) await this.month(authority, true, choice);
    let currentRef = refs.find((ref) => ref.month === current);
    if (!currentRef?.databaseId)
      currentRef = await this.remote.createMonth(current);
    if (currentRef.databaseId !== authority?.databaseId)
      await this.month(currentRef, true, choice);
    const logMonths = new Set(
      this.local.read().logs.map((log) => log.scheduledFor.slice(0, 7)),
    );
    for (const month of logMonths) {
      if (
        month >= current ||
        refs.some((ref) => ref.month === month && ref.databaseId)
      )
        continue;
      const partial = refs.findIndex((ref) => ref.month === month);
      if (partial !== -1) refs.splice(partial, 1);
      refs.push(await this.remote.createMonth(month));
    }
    for (const ref of refs.sort((a, b) => b.month.localeCompare(a.month))) {
      if (
        !ref.databaseId ||
        ref.databaseId === currentRef.databaseId ||
        ref.databaseId === authority?.databaseId ||
        ref.month > current
      )
        continue;
      await this.month(ref, false, choice);
    }
    if (this.pendingChecklists.size)
      throw new Error(
        `Potwierdź listę kroków w aplikacji dla: ${[...this.pendingChecklists].slice(0, 3).join(', ')}${this.pendingChecklists.size > 3 ? '…' : ''}. Te wykonania z Notion czekają na potwierdzenie. Pozostałe zmiany zostały zsynchronizowane.${this.blockedRetirement ? ' Dla usuniętej rutyny wycofaj wykonanie w Notion; do tego czasu kolumna pozostaje zachowana.' : ''}`,
      );
  }
  private async month(
    ref: MonthRef,
    manageRoutines: boolean,
    choice?: ConflictChoice,
  ): Promise<void> {
    const currentMonth = ref.month === localDate(this.clock()).slice(0, 7);
    const key = ledgerKey(this.root, ref.month);
    const raw = await this.storage.getItem(key);
    const ledger: MonthLedger = raw
      ? monthLedgerSchema.parse(JSON.parse(raw))
      : { version: 1, databaseId: ref.databaseId, bindings: [], cells: {} };
    if (ledger.databaseId !== ref.databaseId)
      throw new Error(
        `Tabela ${ref.month} została zastąpiona inną bazą. Przywróć oryginalną tabelę przed synchronizacją.`,
      );
    const persist = () => this.storage.setItem(key, JSON.stringify(ledger));
    let table = await this.remote.readMonth(ref);
    const knownIds = new Set(table.columns.map((column) => column.id));
    if (manageRoutines) {
      for (const binding of ledger.bindings) {
        if (knownIds.has(binding.propertyId)) continue;
        const routine = this.local
          .read()
          .routines.find((item) => item.id === binding.routineId);
        if (routine && !routine.deletedAt) {
          // Removing a known column is an explicit deletion, never "no rows returned".
          const now = this.clock();
          const deleted = {
            ...updateRoutine(routine, { ...routine, active: false }, now),
            deletedAt: now.toISOString(),
          };
          if (!(await this.local.applyRoutine(routine, deleted)))
            throw changedDuringSync();
        }
      }
    }
    for (const column of table.columns) {
      let binding = ledger.bindings.find(
        (item) => item.propertyId === column.id,
      );
      if (binding && !supportedColumn(column))
        throw new Error(
          `Kolumna „${column.name}” zmieniła typ. Przywróć typ select, checkbox lub tekst. Dane pozostały zapisane.`,
        );
      if (!supportedColumn(column)) continue;
      const data = this.local.read();
      const linkedId = linkedRoutineId(column);
      const routineId =
        binding?.routineId ??
        linkedId ??
        `notion-${ref.databaseId}-${encodeURIComponent(column.id)}`;
      let routine = data.routines.find((item) => item.id === routineId);
      if (!routine)
        routine = data.routines.find(
          (item) =>
            !item.deletedAt &&
            (columnName(item) === column.name || item.name === column.name),
        );
      if (!routine) {
        const created = createRoutine(
          inputFromColumn(column),
          routineId,
          this.clock(),
        );
        if (!manageRoutines) {
          created.active = false;
          created.deletedAt = `${addDays(daysInMonth(ref.month).at(-1)!, 1)}T00:00:00.000Z`;
          created.effectiveFrom = `${ref.month}-01`;
        }
        if (!(await this.local.applyRoutine(undefined, created)))
          throw changedDuringSync();
        routine = created;
      }
      if (manageRoutines && !routine.deletedAt) {
        const localInput = routineInputSchema.parse(routine);
        const remoteInput = inputFromColumn(
          column,
          binding?.base ?? localInput,
        );
        // Merge per field so a renamed column and a locally changed time can both survive.
        const merged = { ...localInput };
        for (const field of Object.keys(
          localInput,
        ) as (keyof typeof localInput)[]) {
          // Checklists are local-only; the compact Notion column description cannot hold them.
          if (field === 'checklist') continue;
          Object.assign(merged, {
            [field]: mergeValue(
              binding?.base[field],
              localInput[field],
              remoteInput[field],
              `${routine.name}: ${fieldLabels[field]}`,
              choice,
            ),
          });
        }
        const input = routineInputSchema.parse(merged);
        if (!equal(input, localInput)) {
          const updated = updateRoutine(routine, input, this.clock());
          if (!(await this.local.applyRoutine(routine, updated)))
            throw changedDuringSync();
          routine = updated;
        }
        if (
          currentMonth &&
          (column.name !== columnName(routine) ||
            column.description !== descriptionFor(routine))
        ) {
          const name = columnName(routine);
          if (
            table.columns.some(
              (other) => other.id !== column.id && other.name === name,
            )
          )
            throw new Error(
              `Dwie rutyny mają nazwę „${name}”. Nadaj im różne nazwy przed synchronizacją.`,
            );
          table = await this.remote.updateColumns(table, {
            [column.id]: { name, description: descriptionFor(routine) },
          });
        }
      }
      if (!binding) {
        binding = {
          propertyId: column.id,
          routineId: routine.id,
          base: routineInputSchema.parse(routine),
        };
        ledger.bindings.push(binding);
      } else binding.base = routineInputSchema.parse(routine);
      await persist();
    }
    const data = this.local.read();
    const deletions: Record<string, unknown> = {};
    if (manageRoutines && currentMonth) {
      for (const binding of ledger.bindings) {
        const routine = data.routines.find(
          (item) => item.id === binding.routineId,
        );
        if (
          routine?.deletedAt &&
          table.columns.some((column) => column.id === binding.propertyId)
        )
          deletions[binding.propertyId] = null;
      }
    }
    if (Object.keys(deletions).length) {
      // Preserve remote-only completions before dropping retired columns. A separate
      // delete also frees names for replacement routines with different identities.
      await this.syncCells(table, ledger, persist, choice);
      // Do not erase remote-only results that are still waiting for local checklist proof.
      for (const binding of ledger.bindings) {
        if (
          Object.hasOwn(deletions, binding.propertyId) &&
          this.awaitingRoutineIds.has(binding.routineId)
        ) {
          delete deletions[binding.propertyId];
          this.blockedRetirement = true;
        }
      }
      if (Object.keys(deletions).length)
        table = await this.remote.updateColumns(table, deletions);
    }
    const patches: Record<string, unknown> = {};
    const existingRoutineIds = new Set(
      ledger.bindings
        .filter((binding) =>
          table.columns.some((column) => column.id === binding.propertyId),
        )
        .map((binding) => binding.routineId),
    );
    for (const routine of data.routines) {
      const hasLogs = data.logs.some(
        (log) =>
          log.routineId === routine.id &&
          log.scheduledFor.startsWith(`${ref.month}-`),
      );
      if (
        existingRoutineIds.has(routine.id) ||
        (manageRoutines && currentMonth ? routine.deletedAt : !hasLogs)
      )
        continue;
      const name = columnName(routine);
      if (
        table.columns.some((column) => column.name === name) ||
        Object.hasOwn(patches, name)
      )
        throw new Error(
          `Dwie rutyny mają nazwę „${name}”. Nadaj im różne nazwy przed synchronizacją.`,
        );
      patches[name] = newColumn(routine);
    }
    if (Object.keys(patches).length) {
      table = await this.remote.updateColumns(table, patches);
      for (const column of table.columns.filter(supportedColumn)) {
        if (ledger.bindings.some((binding) => binding.propertyId === column.id))
          continue;
        const routine = this.local
          .read()
          .routines.find((item) => item.id === linkedRoutineId(column));
        if (!routine)
          throw new Error(
            'Nie można powiązać nowej kolumny Notion. Spróbuj ponownie.',
          );
        ledger.bindings.push({
          propertyId: column.id,
          routineId: routine.id,
          base: routineInputSchema.parse(routine),
        });
      }
      await persist();
    }
    let createdDays = false;
    for (const date of daysInMonth(ref.month)) {
      if (table.rows.some((row) => row.date === date)) continue;
      // A recreated day should get the local entries, rather than act as an undo of every cell.
      // Record this intent before the request: its response may be lost after Notion saves the row.
      for (const id of Object.keys(ledger.cells))
        if (id.endsWith(`:${date}`)) delete ledger.cells[id];
      await persist();
      await this.remote.createDay(table, date);
      createdDays = true;
    }
    if (createdDays) table = await this.remote.readMonth(ref);
    await this.syncCells(table, ledger, persist, choice);
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
          throw new Error('Niepełne dane Notion. Spróbuj ponownie.');
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
          routineOn(routine, row.date)?.checklist?.length
        ) {
          this.pendingChecklists.add(`${routine.name} · ${row.date}`);
          this.awaitingRoutineIds.add(routine.id);
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
                    routineName: routine.name,
                    routineIcon: routine.icon,
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
