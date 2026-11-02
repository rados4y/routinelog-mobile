import { describe, expect, it, vi } from 'vitest';
import { repositories } from '../data/repositories';
import { MemoryStorage, monday, routine } from '../test/fixtures';
import { occurrencesForDate } from '../domain/schedule';
import { createRoutineStore } from './createRoutineStore';

describe('routine operations', () => {
  const clock = () => new Date(`${monday}T12:00:00`);
  async function setup() {
    const repos = repositories(new MemoryStorage());
    const store = createRoutineStore(repos, clock, () => 'custom-id');
    await store.getState().load();
    return { repos, store };
  }
  it('supports create, edit, pause and soft delete', async () => {
    const { store, repos } = await setup();
    expect(await store.getState().saveRoutine(routine())).toBe(true);
    expect(
      await store
        .getState()
        .saveRoutine({ ...routine(), name: 'Zmieniona' }, 'custom-id'),
    ).toBe(true);
    await store.getState().toggleRoutine('custom-id');
    expect(
      store.getState().routines.find((r) => r.id === 'custom-id'),
    ).toMatchObject({ name: 'Zmieniona', active: false });
    await store.getState().deleteRoutine('custom-id');
    expect(
      (await repos.routines.list()).find((r) => r.id === 'custom-id')
        ?.deletedAt,
    ).toBeTruthy();
  });
  it('supports done, skipped, undo and reload from durable records', async () => {
    const { store, repos } = await setup();
    await store.getState().setStatus('preset-dog', monday, 'done');
    expect(store.getState().logs[0]?.status).toBe('done');
    await store.getState().setStatus('preset-dog', monday, 'skipped');
    expect(store.getState().logs).toHaveLength(1);
    const reloaded = createRoutineStore(repos, clock);
    await reloaded.getState().load();
    expect(reloaded.getState().logs[0]?.status).toBe('skipped');
    await reloaded.getState().setStatus('preset-dog', monday, 'pending');
    expect(await repos.logs.list()).toEqual([]);
    expect(
      occurrencesForDate(reloaded.getState().routines, [], monday, clock())[0]
        ?.status,
    ).toBe('pending');
  });
  it('retains historical logs when a routine is deleted', async () => {
    const { store } = await setup();
    await store.getState().setStatus('preset-dog', monday, 'done');
    await store.getState().deleteRoutine('preset-dog');
    expect(store.getState().logs).toHaveLength(1);
    expect(store.getState().logs[0]?.routineName).toBe(
      'Wyjście na spacer z psem',
    );
  });
  it('can backfill a weekly completion after its window closed', async () => {
    const { repos } = await setup();
    const later = createRoutineStore(
      repos,
      () => new Date('2026-10-20T12:00:00'),
    );
    await later.getState().load();
    expect(
      await later.getState().setStatus('preset-dog', '2026-10-13', 'done'),
    ).toBe(true);
    expect(later.getState().logs[0]).toMatchObject({
      routineId: 'preset-dog',
      scheduledFor: '2026-10-13',
      status: 'done',
    });
  });
  it('rejects future completion and unscheduled routines', async () => {
    const { store } = await setup();
    expect(
      await store.getState().setStatus('preset-dog', '2026-10-13', 'done'),
    ).toBe(false);
    expect(await store.getState().setStatus('missing', monday, 'done')).toBe(
      false,
    );
    expect(store.getState().logs).toEqual([]);
  });
  it('does not change UI state after a write failure', async () => {
    const { store, repos } = await setup();
    vi.spyOn(repos.logs, 'save').mockRejectedValueOnce(
      new Error('Storage full'),
    );
    expect(await store.getState().setStatus('preset-dog', monday, 'done')).toBe(
      false,
    );
    expect(store.getState().logs).toEqual([]);
    expect(store.getState().error).toBeTruthy();
    expect(store.getState().saving).toBe(false);
    expect(await store.getState().setStatus('preset-dog', monday, 'done')).toBe(
      true,
    );
  });
  it('shows a recoverable loading error', async () => {
    const repos = repositories(new MemoryStorage());
    vi.spyOn(repos.routines, 'list').mockRejectedValueOnce(
      new Error('Read failure'),
    );
    const store = createRoutineStore(repos, clock);
    await store.getState().load();
    expect(store.getState()).toMatchObject({ ready: false, loading: false });
    expect(store.getState().error).toBeTruthy();
    await store.getState().load();
    expect(store.getState().ready).toBe(true);
  });
  it('does not let a delayed sync overwrite newer local edits or completions', async () => {
    const { store } = await setup();
    const expected = store
      .getState()
      .routines.find((item) => item.id === 'preset-dog')!;
    await store
      .getState()
      .saveRoutine({ ...expected, name: 'Nowsza nazwa' }, expected.id);
    expect(
      await store
        .getState()
        .applySyncedRoutine(expected, { ...expected, name: 'Spóźniona nazwa' }),
    ).toBe(false);
    await store.getState().setStatus(expected.id, monday, 'done');
    expect(
      await store
        .getState()
        .applySyncedLog(undefined, undefined, `${expected.id}:${monday}`),
    ).toBe(false);
    expect(
      store.getState().routines.find((item) => item.id === expected.id)?.name,
    ).toBe('Nowsza nazwa');
    expect(store.getState().logs[0]?.status).toBe('done');
  });
});
