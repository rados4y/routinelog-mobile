import { describe, expect, it, vi } from 'vitest';
import { setup } from '../testFixtures';
import { columnName } from '../descriptions';
import { monday, routine } from '../../../test/fixtures';
import { SyncConflictError } from '../models';
import { getStats } from '../../../domain/insights';
import { createRoutine } from '../../../domain/routine';
import { valueFromRoutine } from './sync';

describe('master routine definitions and monthly projections', () => {
  it('migrates existing columns, local-only routines and full descriptions/checklists exactly once', async () => {
    const { store, remote, sync } = await setup();
    const checklist = [{ id: 'local-step', text: 'Read first' }];
    await store.getState().saveRoutine({
      ...routine(),
      name: 'Only on phone',
      note: 'x'.repeat(1000),
      checklist,
    });
    remote.table.columns.push({
      id: 'legacy',
      name: '📚 Legacy reading',
      description: 'Recovered note',
      type: 'select',
    });
    remote.table.rows.forEach((row) => {
      row.cells.legacy = 'pending';
    });
    remote.day.cells.legacy = 'done';
    await sync().run();
    expect(remote.master.initialized).toBe(true);
    expect(remote.master.rows).toHaveLength(3);
    expect(
      remote.master.rows.find((row) => row.routineId === 'local-new')?.input,
    ).toMatchObject({ note: 'x'.repeat(1000), checklist });
    expect(store.getState().logs).toContainEqual(
      expect.objectContaining({ status: 'done', source: 'notion' }),
    );
    remote.table.columns.find((col) => col.id === 'legacy')!.name =
      'Ignored monthly rename';
    await sync().run();
    expect(remote.master.rows).toHaveLength(3);
    expect(
      store
        .getState()
        .routines.some((r) => r.name === 'Ignored monthly rename'),
    ).toBe(false);
    expect(
      store.getState().routines.some((r) => r.name === 'Legacy reading'),
    ).toBe(true);
  });
  it('adds and edits definitions both ways and propagates them into the existing month', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.master.rows.push({
      pageId: 'new-master-page',
      routineId: 'new-master',
      input: {
        ...routine(),
        name: 'New from Notion',
        note: 'Description',
        checklist: [{ id: 'remote-step', text: 'One step' }],
        startDate: monday,
        endDate: '2026-10-31',
      },
      archived: false,
      createdDate: monday,
    });
    await sync().run();
    expect(
      store.getState().routines.find((r) => r.id === 'new-master'),
    ).toMatchObject({
      name: 'New from Notion',
      note: 'Description',
      checklist: [{ id: 'remote-step', text: 'One step' }],
    });
    expect(
      remote.table.columns.some((col) => col.name === '✅ New from Notion'),
    ).toBe(true);
    await store.getState().saveRoutine(
      {
        ...store.getState().routines[0]!,
        note: 'Edited in app',
        reminderTime: '09:30',
      },
      'test-routine',
    );
    remote.master.rows.find((r) => r.routineId === 'test-routine')!.input.name =
      'Renamed in Notion';
    await sync().run();
    expect(store.getState().routines[0]).toMatchObject({
      name: 'Renamed in Notion',
      note: 'Edited in app',
      reminderTime: '09:30',
    });
    expect(
      remote.master.rows.find((r) => r.routineId === 'test-routine')!.input,
    ).toMatchObject({ note: 'Edited in app', reminderTime: '09:30' });
    expect(remote.table.columns.find((col) => col.id === 'column1')!.name).toBe(
      '✅ Renamed in Notion',
    );
  });
  it('recreates removed monthly columns without deleting routines or undoing local results', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store.getState().setStatus('test-routine', monday, 'done');
    await sync().run();
    remote.table.columns = remote.table.columns.filter(
      (col) => col.id !== 'column1',
    );
    remote.table.rows.forEach((row) => {
      delete row.cells.column1;
    });
    await sync().run();
    const replacement = remote.table.columns.find(
      (col) => col.name === columnName(routine()),
    )!;
    expect(replacement.id).not.toBe('column1');
    expect(remote.day.cells[replacement.id]).toBe('done');
    expect(store.getState().routines[0]?.deletedAt).toBeNull();
    expect(store.getState().logs[0]?.status).toBe('done');
    expect(remote.master.rows).toHaveLength(1);
  });
  it('ignores new monthly columns as routine definitions', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.table.columns.push({
      id: 'extra',
      name: 'Just a monthly column',
      type: 'select',
      description: '',
    });
    remote.table.rows.forEach((row) => {
      row.cells.extra = 'pending';
    });
    await sync().run();
    expect(store.getState().routines).toHaveLength(1);
    expect(remote.master.rows).toHaveLength(1);
  });
  it('archives app deletions and master row removal while preserving monthly history', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.day.cells.column1 = 'done';
    remote.master.rows = [];
    await sync().run();
    expect(store.getState().routines[0]?.deletedAt).toBeTruthy();
    expect(remote.master.rows[0]?.archived).toBe(true);
    expect(remote.table.columns.some((col) => col.id === 'column1')).toBe(true);
    expect(store.getState().logs[0]?.status).toBe('done');
    await sync().run();
    expect(remote.master.rows).toHaveLength(1);
    expect(store.getState().routines[0]?.deletedAt).toBeTruthy();
  });
  it('keeps retired and replacement routines with the same name separate', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.day.cells.column1 = 'done';
    await store.getState().deleteRoutine('test-routine');
    await store.getState().saveRoutine(routine());
    await sync().run();
    expect(remote.master.rows).toHaveLength(2);
    expect(
      remote.master.rows.find((row) => row.routineId === 'test-routine')
        ?.archived,
    ).toBe(true);
    const columns = remote.table.columns.filter(
      (column) => column.type === 'select',
    );
    expect(columns).toHaveLength(2);
    expect(new Set(columns.map((column) => column.name)).size).toBe(2);
    expect(store.getState().logs).toEqual([
      expect.objectContaining({ routineId: 'test-routine', status: 'done' }),
    ]);
  });
  it('merges checklist definitions both ways without changing IDs on unchanged steps', async () => {
    const { store, remote, sync } = await setup();
    const checklist = [{ id: 'stable', text: 'First step' }];
    await store
      .getState()
      .saveRoutine({ ...routine(), checklist }, 'test-routine');
    await sync().run();
    remote.master.rows[0]!.input.checklist = [
      { id: 'notion-generated', text: 'First step' },
      { id: 'new', text: 'Second step' },
    ];
    await sync().run();
    expect(store.getState().routines[0]?.checklist).toEqual([
      ...checklist,
      { id: 'new', text: 'Second step' },
    ]);
    await store
      .getState()
      .saveRoutine(
        { ...store.getState().routines[0]!, checklist: [] },
        'test-routine',
      );
    await sync().run();
    expect(remote.master.rows[0]!.input.checklist).toEqual([]);
  });
  it('surfaces conflicting edits and supports explicit resolution', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store
      .getState()
      .saveRoutine({ ...routine(), name: 'App edit' }, 'test-routine');
    remote.master.rows[0]!.input.name = 'Notion edit';
    await expect(sync().run()).rejects.toThrow(SyncConflictError);
    expect(store.getState().routines[0]?.name).toBe('App edit');
    await sync().run('notion');
    expect(store.getState().routines[0]?.name).toBe('Notion edit');
  });
  it('does not duplicate master rows after a lost create response or interrupted migration', async () => {
    const { store, remote, sync } = await setup();
    const write = remote.writeRoutine.bind(remote);
    vi.spyOn(remote, 'writeRoutine').mockImplementationOnce(async (...args) => {
      await write(...args);
      throw new Error('response lost');
    });
    await expect(sync().run()).rejects.toThrow('response lost');
    expect(remote.master.rows).toHaveLength(1);
    expect(remote.master.initialized).toBe(false);
    await sync().run();
    expect(remote.master.rows).toHaveLength(1);
    expect(remote.master.initialized).toBe(true);
    expect(store.getState().routines).toHaveLength(1);
  });
  it('preserves newer local changes made during remote writes and sends them on retry', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    await store
      .getState()
      .saveRoutine({ ...routine(), note: 'Sent' }, 'test-routine');
    const write = remote.writeRoutine.bind(remote);
    vi.spyOn(remote, 'writeRoutine').mockImplementationOnce(async (...args) => {
      const pageId = await write(...args);
      await store
        .getState()
        .saveRoutine(
          { ...store.getState().routines[0]!, note: 'Newer local edit' },
          'test-routine',
        );
      return pageId;
    });
    await sync().run();
    expect(store.getState().routines[0]?.note).toBe('Newer local edit');
    await sync().run();
    expect(remote.master.rows[0]?.input.note).toBe('Newer local edit');
  });
  it('limits generated columns to intersecting months and freezes old column names', async () => {
    const { store, remote, sync, setClock } = await setup();
    await sync().run();
    await store.getState().saveRoutine({
      ...routine(),
      name: 'Future routine',
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });
    await sync().run();
    expect(
      remote.table.columns.some((col) => col.name.includes('Future routine')),
    ).toBe(false);
    const originalName = remote.table.columns.find(
      (col) => col.id === 'column1',
    )!.name;
    setClock('2026-11-02T12:00:00');
    remote.master.rows.find(
      (row) => row.routineId === 'test-routine',
    )!.input.name = 'New month name';
    await sync().run();
    expect(remote.table.columns.find((col) => col.id === 'column1')!.name).toBe(
      originalName,
    );
    expect(
      remote.tables
        .find((table) => table.month === '2026-11')
        ?.columns.some((col) => col.name.includes('New month name')),
    ).toBe(true);
  });
  it('continues to sync statuses, undo, notes and seven-day statistics', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.day.cells.column1 = 'done';
    remote.day.note = 'Notion journal';
    await sync().run();
    expect(
      getStats(
        store.getState().routines,
        store.getState().logs,
        new Date(`${monday}T12:00:00`),
      ).done,
    ).toBe(1);
    expect(store.getState().notes[0]?.content).toBe('Notion journal');
    await store.getState().setStatus('test-routine', monday, 'skipped');
    await sync().run();
    expect(remote.day.cells.column1).toBe('skipped');
    await store.getState().setStatus('test-routine', monday, 'pending');
    await sync().run();
    expect(remote.day.cells.column1).toBe('pending');
  });
  it('rejects replaced master tables, changed IDs and failed reads without removing local data', async () => {
    const { store, remote, sync } = await setup();
    await sync().run();
    remote.master.rows[0]!.routineId = 'edited-id';
    await expect(sync().run()).rejects.toThrow('Routine ID');
    expect(store.getState().routines[0]?.deletedAt).toBeNull();
    remote.master.databaseId = 'replacement';
    await expect(sync().run()).rejects.toThrow('replaced');
    expect(store.getState().routines[0]?.deletedAt).toBeNull();
  });
  it('restores a fresh phone from the initialized master without reimporting stale monthly settings', async () => {
    const { store, remote, sync, storage } = await setup();
    await sync().run();
    remote.master.rows[0]!.input.name = 'Master definition';
    remote.master.rows[0]!.input.startDate = '2026-10-01';
    await storage.removeItem('@routinelog/notion/v2/root/routines');
    // Independent local snapshot with the same identity; resolve first-device differences explicitly.
    await sync().run('notion');
    expect(store.getState().routines[0]?.name).toBe('Master definition');
    expect(
      valueFromRoutine(
        createRoutine({ ...routine(), startDate: '2026-10-01' }, 'new'),
      ),
    ).toMatchObject({ startDate: '2026-10-01', archived: false });
  });
});
