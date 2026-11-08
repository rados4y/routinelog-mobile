import { describe, expect, it, vi } from 'vitest';
import { repositories } from '../../data/repositories';
import { getStats } from '../../domain/insights';
import { routineInputSchema } from '../../domain/models';
import { createRoutineStore } from '../../store/createRoutineStore';
import { MemoryStorage, monday, routine } from '../../test/fixtures';
import {
  cellWrite,
  columnName,
  descriptionFor,
  inputFromColumn,
  newColumn,
  statusFromText,
  supportedColumn,
} from './descriptions';
import {
  SyncConflictError,
  type MonthRef,
  type MonthTable,
  type NotionGateway,
} from './models';
import { daysInMonth, NotionSync } from './sync';
import { isNotesColumn, noteWrite } from './dailyNotes';
import { maxNoteLength } from '../../domain/note';

class FakeNotion implements NotionGateway {
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
async function setup() {
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

describe('daily note synchronization', () => {
  it('treats the literal text pending as note content and retains an explicit first-sync clear', async () => {
    const { store, remote, sync, storage } = await setup();
    await sync().run();
    await storage.removeItem('@routinelog/notion/v1/root/2026-10');
    await store.getState().saveNote(monday, 'pending');
    remote.day.note = 'Remote journal';
    await expect(sync().run()).rejects.toThrow(SyncConflictError);
    expect(store.getState().notes[0]?.content).toBe('pending');
    await store.getState().saveNote(monday, '');
    await expect(sync().run()).rejects.toThrow(SyncConflictError);
    expect(remote.day.note).toBe('Remote journal');
    await sync().run('app');
    expect(remote.day.note).toBe('');
  });
  it('syncs multiline notes both ways without creating a routine for the Notes column', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().saveNote(monday, 'First line\nSecond 💛');
    await sync().run();
    expect(remote.day.note).toBe('First line\nSecond 💛');
    expect(remote.table.columns.filter(isNotesColumn)).toHaveLength(1);
    expect(store.getState().routines).toHaveLength(1);
    remote.day.note = 'Edited in Notion';
    await sync().run();
    expect(store.getState().notes[0]).toMatchObject({
      date: monday,
      content: 'Edited in Notion',
      source: 'notion',
    });
    remote.table.columns.find(isNotesColumn)!.name = 'My journal';
    await store.getState().saveNote(monday, 'Updated on phone');
    await sync().run();
    expect(remote.day.note).toBe('Updated on phone');
    expect(remote.table.columns.filter(isNotesColumn)).toHaveLength(1);
  });
  it('propagates clearing in either direction and retains the empty local record after reload', async () => {
    const { store, repos, remote, sync } = await setup();
    await store.getState().saveNote(monday, 'Clear me');
    await sync().run();
    await store.getState().saveNote(monday, '');
    await sync().run();
    expect(remote.day.note).toBe('');
    await store.getState().saveNote(monday, 'Again');
    await sync().run();
    remote.day.note = '';
    await sync().run();
    const reload = createRoutineStore(repos);
    await reload.getState().load();
    expect(
      reload.getState().notes.find((note) => note.date === monday)?.content,
    ).toBe('');
    await sync().run();
    expect(remote.day.note).toBe('');
  });
  it('surfaces simultaneous edits and supports both explicit conflict choices', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().saveNote(monday, 'Base');
    await sync().run();
    await store.getState().saveNote(monday, 'Phone edit');
    remote.day.note = 'Notion edit';
    await expect(sync().run()).rejects.toThrow(SyncConflictError);
    expect(store.getState().notes[0]?.content).toBe('Phone edit');
    expect(remote.day.note).toBe('Notion edit');
    await sync().run('app');
    expect(remote.day.note).toBe('Phone edit');
    await store.getState().saveNote(monday, 'Another phone edit');
    remote.day.note = 'Another Notion edit';
    await sync().run('notion');
    expect(store.getState().notes[0]?.content).toBe('Another Notion edit');
  });
  it('restores a deleted Notes column from local content instead of interpreting it as a mass deletion', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().saveNote(monday, 'Preserved');
    await sync().run();
    remote.table.columns = remote.table.columns.filter(
      (column) => !isNotesColumn(column),
    );
    for (const row of remote.table.rows) row.note = '';
    await sync().run();
    expect(store.getState().notes[0]?.content).toBe('Preserved');
    expect(remote.day.note).toBe('Preserved');
  });
  it('creates past and future note months without changing the active routine schema', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().saveNote('2026-09-02', 'Past');
    await store.getState().saveNote('2027-01-04', 'Future plan');
    await sync().run();
    expect(
      remote.tables
        .find((table) => table.month === '2026-09')
        ?.rows.find((row) => row.date === '2026-09-02')?.note,
    ).toBe('Past');
    expect(
      remote.tables
        .find((table) => table.month === '2027-01')
        ?.rows.find((row) => row.date === '2027-01-04')?.note,
    ).toBe('Future plan');
    expect(store.getState().routines).toHaveLength(1);
    expect(store.getState().routines[0]?.active).toBe(true);
  });
  it('keeps a newer phone edit made during a remote write ready for the next sync', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().saveNote(monday, 'Sent text');
    const original = remote.writeCells.bind(remote);
    vi.spyOn(remote, 'writeCells').mockImplementationOnce(async (...args) => {
      await original(...args);
      await store.getState().saveNote(monday, 'Newer text');
    });
    await sync().run();
    expect(store.getState().notes[0]?.content).toBe('Newer text');
    await sync().run();
    expect(remote.day.note).toBe('Newer text');
  });
  it('splits long Unicode notes into safe rich-text chunks without truncation', () => {
    const content = '💛a\n'.repeat(3000);
    const value = noteWrite(content);
    expect(value.rich_text.length).toBeGreaterThan(1);
    expect(
      value.rich_text.every((part) => part.text.content.length <= 1800),
    ).toBe(true);
    expect(value.rich_text.map((part) => part.text.content).join('')).toBe(
      content,
    );
    expect(() => noteWrite('x'.repeat(maxNoteLength + 1))).toThrow('20');
  });
});

describe('monthly, bidirectional Notion synchronization', () => {
  it('pushes done, skipped and durable undo across sync instances', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'done');
    await sync().run();
    expect(remote.day.cells.column1).toBe('done');
    await store.getState().setStatus('test-routine', monday, 'skipped');
    await sync().run();
    expect(remote.day.cells.column1).toBe('skipped');
    await store.getState().setStatus('test-routine', monday, 'pending');
    await sync().run();
    expect(remote.day.cells.column1).toBe('pending');
    expect(store.getState().logs).toEqual([]);
  });
  it('pulls statuses, reflects them in stats and supports remote undo', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.day.cells.column1 = 'done';
    await sync().run();
    expect(store.getState().logs[0]).toMatchObject({
      source: 'notion',
      scheduledFor: monday,
      status: 'done',
    });
    expect(
      getStats(
        store.getState().routines,
        store.getState().logs,
        new Date(`${monday}T12:00:00`),
      ).done,
    ).toBe(1);
    remote.day.cells.column1 = 'skipped';
    await sync().run();
    expect(store.getState().logs[0]?.status).toBe('skipped');
    remote.day.cells.column1 = 'pending';
    await sync().run();
    expect(store.getState().logs).toEqual([]);
  });
  it('imports a new column, preserves identity on rename, and soft deletes on removal', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.table.columns.push({
      id: 'new-notion',
      name: '📚 Czytanie',
      description: 'Dziesięć stron',
      type: 'select',
    });
    remote.table.rows.forEach((row) => {
      row.cells['new-notion'] = 'pending';
    });
    await sync().run();
    const added = store
      .getState()
      .routines.find((item) => item.name === 'Czytanie')!;
    expect(added).toMatchObject({
      note: 'Dziesięć stron',
      schedule: { kind: 'daily' },
      icon: '📚',
    });
    remote.table.columns.find((col) => col.id === 'new-notion')!.name =
      '📚 Książka';
    await sync().run();
    expect(
      store.getState().routines.find((item) => item.id === added.id)?.name,
    ).toBe('Książka');
    await store.getState().setStatus(added.id, monday, 'done');
    await sync().run();
    remote.table.columns = remote.table.columns.filter(
      (col) => col.id !== 'new-notion',
    );
    await sync().run();
    expect(
      store.getState().routines.find((item) => item.id === added.id)?.deletedAt,
    ).toBeTruthy();
    expect(
      store.getState().logs.find((item) => item.routineId === added.id)?.status,
    ).toBe('done');
    await sync().run();
    expect(remote.table.columns.some((col) => col.id === 'new-notion')).toBe(
      false,
    );
  });
  it('pushes new routines, descriptions, pause and deletion from the app', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().saveRoutine({
      ...routine(),
      name: 'Z telefonu',
      note: 'Opis z telefonu',
    });
    await sync().run();
    expect(
      remote.table.columns.find((col) => col.name === '✅ Z telefonu')
        ?.description,
    ).toContain('Opis z telefonu');
    await store.getState().toggleRoutine('local-new');
    await sync().run();
    expect(
      remote.table.columns.find((col) => col.name === '✅ Z telefonu')
        ?.description,
    ).toContain('Aktywna: nie');
    await store.getState().deleteRoutine('local-new');
    await sync().run();
    expect(
      remote.table.columns.some((col) => col.name === '✅ Z telefonu'),
    ).toBe(false);
  });
  it('merges independent field changes without losing either side', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store
      .getState()
      .saveRoutine(
        { ...store.getState().routines[0]!, reminderTime: '09:30' },
        'test-routine',
      );
    remote.table.columns[2]!.name = '✅ Nazwa z Notion';
    await sync().run();
    expect(store.getState().routines[0]).toMatchObject({
      name: 'Nazwa z Notion',
      reminderTime: '09:30',
    });
    expect(remote.table.columns[2]!.description).toContain('Godzina: 09:30');
  });
  it('imports remote-only history before retiring a locally deleted routine column', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.day.cells.column1 = 'done';
    await store.getState().deleteRoutine('test-routine');
    await sync().run();
    expect(remote.table.columns.some((column) => column.id === 'column1')).toBe(
      false,
    );
    expect(store.getState().logs[0]).toMatchObject({
      routineId: 'test-routine',
      status: 'done',
      source: 'notion',
    });
  });
  it('can replace an old routine with an identically named new routine without inheriting its completions', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.day.cells.column1 = 'done';
    await store.getState().deleteRoutine('test-routine');
    await store.getState().saveRoutine(routine());
    await sync().run();
    expect(
      remote.table.columns.filter((column) => column.type === 'select'),
    ).toHaveLength(1);
    expect(
      remote.table.columns.find((column) => column.type === 'select')
        ?.description,
    ).toContain('id=local-new');
    expect(store.getState().logs).toHaveLength(1);
    expect(store.getState().logs[0]?.routineId).toBe('test-routine');
  });
  it('keeps imported history if deleting its old column fails and recovers on retry', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.day.cells.column1 = 'done';
    await store.getState().deleteRoutine('test-routine');
    vi.spyOn(remote, 'updateColumns').mockRejectedValueOnce(
      new Error('offline'),
    );
    await expect(sync().run()).rejects.toThrow('offline');
    expect(store.getState().logs[0]?.status).toBe('done');
    await sync().run();
    expect(store.getState().logs).toHaveLength(1);
    expect(remote.table.columns.some((column) => column.id === 'column1')).toBe(
      false,
    );
  });
  it('does not overwrite a real conflict until a version is selected', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'skipped');
    remote.day.cells.column1 = 'done';
    await expect(sync().run()).rejects.toBeInstanceOf(SyncConflictError);
    expect(store.getState().logs[0]?.status).toBe('skipped');
    expect(remote.day.cells.column1).toBe('done');
    await sync().run('notion');
    expect(store.getState().logs[0]?.status).toBe('done');
  });
  it('can resolve a conflict in favor of the app', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'skipped');
    remote.day.cells.column1 = 'done';
    await sync().run('app');
    expect(remote.day.cells.column1).toBe('skipped');
  });
  it('retains local data when offline and retries without duplicates', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'done');
    vi.spyOn(remote, 'listMonths').mockRejectedValueOnce(new Error('offline'));
    await expect(sync().run()).rejects.toThrow('offline');
    expect(store.getState().logs[0]?.status).toBe('done');
    await sync().run();
    await sync().run();
    expect(remote.day.cells.column1).toBe('done');
    expect(
      remote.table.columns.filter((col) => col.type === 'select'),
    ).toHaveLength(1);
  });
  it('does not treat a failed table read or unsupported type as column deletion', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    vi.spyOn(remote, 'readMonth').mockRejectedValueOnce(new Error('denied'));
    await expect(sync().run()).rejects.toThrow('denied');
    expect(store.getState().routines[0]?.deletedAt).toBeNull();
    remote.table.columns[2]!.type = 'formula';
    await expect(sync().run()).rejects.toThrow('changed type');
    expect(store.getState().routines[0]?.deletedAt).toBeNull();
  });
  it('preserves old columns during rollover, while current month deletion removes the routine', async () => {
    const { store, remote, sync, setClock } = await setup();
    await sync().run();
    setClock('2026-11-01T12:00:00');
    await sync().run();
    const november = remote.tables.find((table) => table.month === '2026-11')!;
    expect(november.rows).toHaveLength(30);
    expect(
      november.columns.some((col) => col.name === columnName(routine())),
    ).toBe(true);
    await store.getState().deleteRoutine('test-routine');
    await sync().run();
    expect(november.columns.some((col) => col.type === 'select')).toBe(false);
    expect(remote.table.columns.some((col) => col.type === 'select')).toBe(
      true,
    );
  });
  it('restores a missing day from local data instead of erasing completions', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().setStatus('test-routine', monday, 'done');
    await sync().run();
    remote.table.rows = remote.table.rows.filter((row) => row.date !== monday);
    await sync().run();
    expect(remote.day.cells.column1).toBe('done');
    expect(store.getState().logs[0]?.status).toBe('done');
  });
  it('does not import future completions', async () => {
    const { store, remote, sync } = await setup();
    remote.table.rows.find((row) => row.date === '2026-10-13')!.cells.column1 =
      'done';
    await sync().run();
    expect(store.getState().logs).toEqual([]);
  });
  it('keeps completions when a recreated day was saved remotely but the response was lost', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().setStatus('test-routine', monday, 'done');
    await sync().run();
    remote.table.rows = remote.table.rows.filter((row) => row.date !== monday);
    const create = remote.createDay.bind(remote);
    vi.spyOn(remote, 'createDay').mockImplementationOnce(async (...args) => {
      await create(...args);
      throw new Error('response lost');
    });
    await expect(sync().run()).rejects.toThrow('response lost');
    await sync().run();
    expect(remote.day.cells.column1).toBe('done');
    expect(store.getState().logs[0]?.status).toBe('done');
  });
  it('recovers an interrupted column import even if its new routine was renamed locally', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.table.columns.push({
      id: 'fresh',
      name: '📚 Czytanie',
      description: '',
      type: 'select',
    });
    remote.table.rows.forEach((row) => {
      row.cells.fresh = 'pending';
    });
    vi.spyOn(remote, 'updateColumns').mockRejectedValueOnce(
      new Error('offline'),
    );
    await expect(sync().run()).rejects.toThrow('offline');
    const imported = store
      .getState()
      .routines.find((item) => item.name === 'Czytanie')!;
    await store
      .getState()
      .saveRoutine({ ...imported, name: 'Nowsza nazwa' }, imported.id);
    await sync().run('app');
    expect(
      remote.table.columns.find((column) => column.id === 'fresh')?.name,
    ).toBe('📚 Nowsza nazwa');
    expect(store.getState().routines).toHaveLength(2);
  });
  it('retains skipped locally when the user chose a checkbox column', async () => {
    const { store, remote, sync } = await setup();
    remote.table.columns[2]!.type = 'checkbox';
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'skipped');
    await sync().run();
    await sync().run();
    expect(store.getState().logs[0]?.status).toBe('skipped');
  });
  it('recovers when a remote write succeeded but its acknowledgement could not be saved', async () => {
    const { store, storage, remote, sync } = await setup();
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'done');
    const original = storage.setItem.bind(storage);
    vi.spyOn(storage, 'setItem').mockImplementation(async (key, value) => {
      if (remote.day.cells.column1 === 'done') {
        vi.mocked(storage.setItem).mockImplementation(original);
        throw new Error('disk full');
      }
      await original(key, value);
    });
    await expect(sync().run()).rejects.toThrow('disk full');
    await sync().run();
    expect(store.getState().logs).toHaveLength(1);
    expect(remote.day.cells.column1).toBe('done');
  });
  it('keeps an edit made while a remote push was in flight for the next sync', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'done');
    const write = remote.writeCells.bind(remote);
    vi.spyOn(remote, 'writeCells').mockImplementationOnce(async (...args) => {
      await store.getState().setStatus('test-routine', monday, 'skipped');
      await write(...args);
    });
    await sync().run();
    expect(store.getState().logs[0]?.status).toBe('skipped');
    await sync().run();
    expect(remote.day.cells.column1).toBe('skipped');
  });
});

describe('Notion column encoding', () => {
  it('round trips all schedule variants and editable settings', () => {
    for (const schedule of [
      { kind: 'daily' },
      { kind: 'weekdays', days: [1, 3, 5] },
      { kind: 'interval', every: 30, anchor: monday },
      { kind: 'weeklyTarget', count: 3 },
    ] as const) {
      const r = {
        ...routine(),
        schedule:
          schedule.kind === 'weekdays'
            ? { ...schedule, days: [...schedule.days] }
            : schedule,
        target: 3,
        unit: 'szklanki',
        note: 'Małe kroki\nDruga linia',
        active: false,
      };
      const input = inputFromColumn({
        id: 'prop',
        name: columnName(r),
        description: descriptionFor(r),
        type: 'select',
      });
      expect(input).toEqual(routineInputSchema.parse(r));
    }
  });
  it('rejects unknown statuses and invalid descriptions instead of erasing them', () => {
    expect(() => statusFromText('może')).toThrow('Unknown');
    expect(() =>
      inputFromColumn({
        id: 'p',
        name: 'Rutyna',
        description: 'Godzina: 99:30',
        type: 'select',
      }),
    ).toThrow('Fix the description');
  });
  it('supports leap years, checkbox undo and clear select values', () => {
    expect(daysInMonth('2028-02')).toHaveLength(29);
    expect(daysInMonth('2026-02')).toHaveLength(28);
    expect(
      cellWrite(
        { id: 'p', name: 'x', description: '', type: 'select' },
        'pending',
      ),
    ).toEqual({ select: null });
    expect(
      cellWrite(
        { id: 'p', name: 'x', description: '', type: 'checkbox' },
        'pending',
      ),
    ).toEqual({ checkbox: false });
    expect(newColumn(routine())).toHaveProperty('select');
  });
});

describe('Notion checklist protection', () => {
  const items = [{ id: 'one', text: 'Wymagany krok' }];
  it('preserves local checklist definitions when importing a remote rename', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store
      .getState()
      .saveRoutine({ ...routine(), checklist: items }, 'test-routine');
    remote.table.columns.find((column) => column.id === 'column1')!.name =
      'Nowa nazwa';
    await sync().run();
    expect(store.getState().routines[0]).toMatchObject({
      name: 'Nowa nazwa',
      checklist: items,
    });
  });
  it('leaves remote done awaiting checklist confirmation while syncing other cells', async () => {
    const { store, remote, sync } = await setup();
    await store
      .getState()
      .saveRoutine({ ...routine(), checklist: items }, 'test-routine');
    await sync().run();
    remote.day.cells.column1 = 'done';
    await store.getState().saveRoutine({ ...routine(), name: 'Druga rutyna' });
    await expect(sync().run()).rejects.toThrow('Confirm the checklist');
    const second = remote.table.columns.find((column) =>
      column.name.includes('Druga rutyna'),
    )!;
    remote.day.cells[second.id] = 'done';
    await expect(sync().run()).rejects.toThrow('Confirm the checklist');
    expect(store.getState().logs).toHaveLength(1);
    expect(store.getState().logs[0]).toMatchObject({
      routineId: 'local-new',
      status: 'done',
    });
    expect(remote.day.cells.column1).toBe('done');
    expect(
      remote.table.columns.some((column) =>
        column.name.includes('Druga rutyna'),
      ),
    ).toBe(true);
    await store.getState().setStatus(
      'test-routine',
      monday,
      'done',
      items.map((item) => ({ ...item, checked: true })),
    );
    await sync().run();
    expect(
      store.getState().logs.find((log) => log.routineId === 'test-routine')
        ?.checklist,
    ).toEqual([{ ...items[0], checked: true }]);
  });
  it('keeps legacy completions valid after adding checklist steps', async () => {
    const { store, sync } = await setup();
    await store.getState().setStatus('test-routine', monday, 'done');
    await store
      .getState()
      .saveRoutine({ ...routine(), checklist: items }, 'test-routine');
    await expect(sync().run()).resolves.toBeUndefined();
    expect(store.getState().logs[0]?.status).toBe('done');
  });
});

it('preserves a retired Notion column until its unconfirmed checklist result is resolved', async () => {
  const { store, remote, sync } = await setup();
  await store
    .getState()
    .saveRoutine(
      { ...routine(), checklist: [{ id: 'one', text: 'Krok' }] },
      'test-routine',
    );
  await sync().run();
  remote.day.cells.column1 = 'done';
  await store.getState().deleteRoutine('test-routine');
  await expect(sync().run()).rejects.toThrow('column is kept');
  expect(remote.table.columns.some((column) => column.id === 'column1')).toBe(
    true,
  );
  expect(remote.day.cells.column1).toBe('done');
  remote.day.cells.column1 = 'skipped';
  await sync().run();
  expect(remote.table.columns.some((column) => column.id === 'column1')).toBe(
    false,
  );
  expect(store.getState().logs[0]).toMatchObject({
    routineId: 'test-routine',
    status: 'skipped',
  });
});

it('requires checklist confirmation for a remote completion before the local import date', async () => {
  const { store, remote, sync } = await setup();
  await store
    .getState()
    .saveRoutine(
      { ...routine(), checklist: [{ id: 'step', text: 'Krok' }] },
      'test-routine',
    );
  remote.table.rows.find((row) => row.date === '2026-10-11')!.cells.column1 =
    'done';
  await expect(sync().run()).rejects.toThrow('Confirm the checklist');
  expect(store.getState().logs).toEqual([]);
  expect(
    await store
      .getState()
      .setStatus(
        'test-routine',
        '2026-10-11',
        'done',
        [{ id: 'step', text: 'Krok', checked: true }],
        'calendar',
      ),
  ).toBe(true);
  await expect(sync().run()).resolves.toBeUndefined();
});
