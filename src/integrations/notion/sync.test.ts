import { describe, expect, it, vi } from 'vitest';
import { routineInputSchema } from '../../domain/models';
import { createRoutineStore } from '../../store/createRoutineStore';
import { monday, routine } from '../../test/fixtures';
import {
  cellWrite,
  columnName,
  descriptionFor,
  inputFromColumn,
  newColumn,
  statusFromText,
} from './descriptions';
import { SyncConflictError } from './models';
import { daysInMonth } from './sync';
import { setup } from './testFixtures';
import { isNotesColumn, noteWrite } from './dailyNotes';
import { maxNoteLength } from '../../domain/note';

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
    remote.master.rows[0]!.input.name = 'Nowa nazwa';
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

it('preserves retired monthly columns and waits for checklist confirmation', async () => {
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
  await expect(sync().run()).rejects.toThrow('Confirm the checklist');
  expect(remote.table.columns.some((column) => column.id === 'column1')).toBe(
    true,
  );
  expect(remote.day.cells.column1).toBe('done');
  remote.day.cells.column1 = 'skipped';
  await sync().run();
  expect(remote.table.columns.some((column) => column.id === 'column1')).toBe(
    true,
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
