import { repositories } from '../../data/repositories';
import { createRoutineStore } from '../../store/createRoutineStore';
import { routineInputSchema } from '../../domain/models';
import { MemoryStorage, monday, routine } from '../../test/fixtures';
import {
  columnName,
  descriptionFor,
  supportedColumn,
  statusFromText,
} from './descriptions';
import type { MonthRef, MonthTable, NotionGateway } from './models';
import type { MasterTable, MasterValue } from './master/models';
import { NotionSync, daysInMonth } from './sync';
export class FakeNotion implements NotionGateway {
  master: MasterTable = {
    databaseId: 'master-db',
    dataSourceId: 'master-ds',
    initialized: false,
    rows: [],
  };
  private routineSequence = 0;
  async readRoutines() {
    return structuredClone(this.master);
  }
  async writeRoutine(
    _table: MasterTable,
    routineId: string,
    value: MasterValue,
    pageId?: string,
  ) {
    const row = {
      pageId: pageId ?? `master-page-${++this.routineSequence}`,
      routineId,
      input: routineInputSchema.parse(value),
      archived: value.archived,
      createdDate: monday,
    };
    this.master.rows = [
      ...this.master.rows.filter((item) => item.pageId !== row.pageId),
      row,
    ];
    return row.pageId;
  }
  async finishRoutineMigration() {
    this.master.initialized = true;
  }
  tables: MonthTable[];
  writes = 0;
  private columnSequence = 0;
  constructor() {
    const r = routine();
    this.tables = [
      {
        month: '2026-10',
        pageId: 'month-page',
        databaseId: 'db',
        dataSourceId: 'ds',
        columns: [
          { id: 'title', name: 'Dzień', description: '', type: 'title' },
          { id: 'date', name: 'Data', description: '', type: 'date' },
          {
            id: 'column1',
            name: columnName(r),
            description: descriptionFor(r),
            type: 'select',
          },
        ],
        rows: daysInMonth('2026-10').map((date) => ({
          id: date,
          date,
          editedAt: `${monday}T10:00:00Z`,
          cells: { column1: 'pending' },
        })),
      },
    ];
  }
  get table() {
    return this.tables[0]!;
  }
  get day() {
    return this.table.rows.find((row) => row.date === monday)!;
  }
  async listMonths() {
    return this.tables.map(({ month, pageId, databaseId }) => ({
      month,
      pageId,
      databaseId,
    }));
  }
  async createMonth(month: string) {
    const table = {
      ...structuredClone(this.table),
      month,
      pageId: `${month}-page`,
      databaseId: `${month}-db`,
      dataSourceId: `${month}-ds`,
      columns: this.table.columns.filter((col) =>
        ['title', 'date'].includes(col.type),
      ),
      rows: [],
    };
    this.tables.push(table);
    return table;
  }
  async readMonth(ref: MonthRef) {
    return structuredClone(
      this.tables.find((table) => table.databaseId === ref.databaseId)!,
    );
  }
  async updateColumns(ref: MonthTable, patches: Record<string, unknown>) {
    const table = this.tables.find(
      (item) => item.databaseId === ref.databaseId,
    )!;
    for (const [key, raw] of Object.entries(patches)) {
      const column = table.columns.find((col) => col.id === key);
      if (raw === null) {
        table.columns = table.columns.filter((col) => col.id !== key);
        continue;
      }
      const patch = raw as {
        name?: string;
        description: string;
        select?: unknown;
        rich_text?: unknown;
      };
      if (column) Object.assign(column, patch);
      else {
        const id = `new-${++this.columnSequence}`;
        table.columns.push({
          id,
          name: key,
          description: patch.description,
          type: patch.rich_text ? 'rich_text' : 'select',
        });
        table.rows.forEach((row) => {
          row.cells[id] = 'pending';
        });
      }
    }
    return structuredClone(table);
  }
  async createDay(ref: MonthTable, date: string) {
    const table = this.tables.find(
      (item) => item.databaseId === ref.databaseId,
    )!;
    table.rows.push({
      id: `${ref.databaseId}:${date}`,
      date,
      editedAt: `${monday}T10:00:00Z`,
      cells: Object.fromEntries(
        table.columns.filter(supportedColumn).map((col) => [col.id, 'pending']),
      ),
    });
  }
  async writeCells(rowId: string, properties: Record<string, unknown>) {
    this.writes++;
    const row = this.tables
      .flatMap((table) => table.rows)
      .find((row) => row.id === rowId)!;
    for (const [key, raw] of Object.entries(properties)) {
      const value = raw as {
        select?: { name: string } | null;
        checkbox?: boolean;
        rich_text?: { text: { content: string } }[];
      };
      if (value.rich_text) {
        row.note = value.rich_text.map((part) => part.text.content).join('');
        continue;
      }
      row.cells[key] =
        value.checkbox === undefined
          ? statusFromText(value.select?.name ?? '')
          : value.checkbox
            ? 'done'
            : 'pending';
    }
  }
}
export async function setup() {
  const storage = new MemoryStorage();
  const repos = repositories(storage);
  await storage.setItem('@routinelog/seed-version', '2');
  await repos.routines.save(routine());
  let now = new Date(`${monday}T12:00:00`);
  const store = createRoutineStore(
    repos,
    () => now,
    () => 'local-new',
  );
  await store.getState().load();
  const remote = new FakeNotion();
  const sync = () =>
    new NotionSync(
      'root',
      remote,
      {
        read: () => store.getState(),
        applyNote: (...args) => store.getState().applySyncedNote(...args),
        applyRoutine: (...args) => store.getState().applySyncedRoutine(...args),
        applyLog: (...args) => store.getState().applySyncedLog(...args),
      },
      storage,
      () => now,
    );
  return {
    storage,
    store,
    repos,
    remote,
    sync,
    setClock: (date: string) => {
      now = new Date(date);
    },
  };
}
