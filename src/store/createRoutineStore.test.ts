import { describe, expect, it, vi } from 'vitest';
import { repositories } from '../data/repositories';
import { MemoryStorage, monday, routine } from '../test/fixtures';
import { createLog } from '../domain/log';
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

describe('checklist persistence and status cycle', () => {
  const clock = () => new Date(`${monday}T12:00:00`);
  const items = [
    { id: 'one', text: 'Pierwszy krok' },
    { id: 'two', text: 'Drugi krok' },
  ];
  const proof = items.map((item) => ({ ...item, checked: true }));
  async function setup() {
    const repos = repositories(new MemoryStorage());
    const store = createRoutineStore(repos, clock, () => 'checklist');
    await store.getState().load();
    await store.getState().saveRoutine({ ...routine(), checklist: items });
    return { store, repos };
  }
  it('rejects incomplete completion, preserves previous status, and persists complete proof', async () => {
    const { store, repos } = await setup();
    await store.getState().setStatus('checklist', monday, 'skipped');
    expect(
      await store
        .getState()
        .setStatus('checklist', monday, 'done', proof.slice(0, 1)),
    ).toBe(false);
    expect(store.getState().logs[0]?.status).toBe('skipped');
    expect(
      await store.getState().setStatus('checklist', monday, 'done', proof),
    ).toBe(true);
    const reload = createRoutineStore(repos, clock);
    await reload.getState().load();
    expect(reload.getState().logs[0]?.checklist).toEqual(proof);
    await reload
      .getState()
      .saveRoutine(
        { ...routine(), checklist: [{ id: 'one', text: 'Zmieniony krok' }] },
        'checklist',
      );
    expect(reload.getState().logs[0]?.checklist).toEqual(proof);
    await reload.getState().setStatus('checklist', monday, 'pending');
    expect(
      await reload.getState().setStatus('checklist', monday, 'done', proof),
    ).toBe(false);
    expect(reload.getState().logs).toEqual([]);
  });
  it('persists the entire four-state cycle and clears old proof before a new attempt', async () => {
    const { store, repos } = await setup();
    for (const status of ['done', 'missed', 'skipped', 'pending'] as const) {
      expect(
        await store.getState().setStatus('checklist', monday, status, proof),
      ).toBe(true);
      const reload = createRoutineStore(repos, clock);
      await reload.getState().load();
      expect(reload.getState().logs[0]?.status ?? 'pending').toBe(status);
      if (status !== 'done')
        expect(reload.getState().logs[0]?.checklist).toBeUndefined();
    }
    expect(await store.getState().setStatus('checklist', monday, 'done')).toBe(
      false,
    );
    expect(await repos.logs.list()).toEqual([]);
  });
  it('rejects a new synchronized done without checklist proof', async () => {
    const { store } = await setup();
    const log = {
      ...createLog(routine(), monday, 'done', clock()),
      id: `checklist:${monday}`,
      routineId: 'checklist',
      source: 'notion' as const,
    };
    expect(await store.getState().applySyncedLog(undefined, log, log.id)).toBe(
      false,
    );
    expect(store.getState().logs).toEqual([]);
  });
});

describe('manual calendar persistence', () => {
  const clock = () => new Date('2026-11-02T12:00:00');
  async function setup() {
    const repos = repositories(new MemoryStorage());
    const store = createRoutineStore(repos, clock);
    await store.getState().load();
    return { repos, store };
  }
  it('cycles a newly imported Sunday routine on both an earlier date and an off-schedule Monday', async () => {
    const { store, repos } = await setup();
    const original = store
      .getState()
      .routines.find((r) => r.id === 'preset-book')!;
    for (const date of ['2026-11-01', '2026-11-02']) {
      for (const status of ['done', 'missed', 'skipped', 'pending'] as const) {
        expect(
          await store
            .getState()
            .setStatus(original.id, date, status, undefined, 'calendar'),
        ).toBe(true);
        const reload = createRoutineStore(repos, clock);
        await reload.getState().load();
        expect(
          reload
            .getState()
            .logs.find(
              (log) =>
                log.routineId === original.id && log.scheduledFor === date,
            )?.status ?? 'pending',
        ).toBe(status);
      }
    }
    expect(store.getState().routines.find((r) => r.id === original.id)).toEqual(
      original,
    );
  });
  it('enforces checklist proof before import and rejects future entries', async () => {
    const { store } = await setup();
    const original = store
      .getState()
      .routines.find((r) => r.id === 'preset-book')!;
    const checklist = [{ id: 'step', text: 'Przeczytać rozdział' }];
    await store.getState().saveRoutine({ ...original, checklist }, original.id);
    expect(
      await store
        .getState()
        .setStatus(original.id, '2026-11-01', 'done', undefined, 'calendar'),
    ).toBe(false);
    expect(
      await store
        .getState()
        .setStatus(
          original.id,
          '2026-11-01',
          'done',
          [{ ...checklist[0]!, checked: true }],
          'calendar',
        ),
    ).toBe(true);
    expect(
      await store
        .getState()
        .setStatus(
          original.id,
          '2026-11-03',
          'done',
          [{ ...checklist[0]!, checked: true }],
          'calendar',
        ),
    ).toBe(false);
    expect(store.getState().error).toContain('Future date');
    expect(store.getState().logs).toHaveLength(1);
  });
  it('keeps a calendar entry visible on the daily view without inserting automatic occurrences', async () => {
    const { store } = await setup();
    await store
      .getState()
      .setStatus('preset-book', '2026-11-01', 'done', undefined, 'calendar');
    expect(
      occurrencesForDate(
        store.getState().routines,
        store.getState().logs,
        '2026-11-01',
        clock(),
      ).find((o) => o.routine.id === 'preset-book')?.status,
    ).toBe('done');
    await store.getState().setStatus('preset-book', '2026-11-01', 'pending');
    expect(
      occurrencesForDate(
        store.getState().routines,
        store.getState().logs,
        '2026-11-01',
        clock(),
      ).some((o) => o.routine.id === 'preset-book'),
    ).toBe(false);
  });
});

it('keeps initialized widget state when the app requests its initial load again', async () => {
  const repos = repositories(new MemoryStorage());
  const clock = () => new Date(`${monday}T12:00:00`);
  const store = createRoutineStore(repos, clock);
  await store.getState().load();
  await store.getState().setStatus('preset-dog', monday, 'done');
  const staleRead = vi.spyOn(repos.logs, 'list').mockResolvedValue([]);
  await store.getState().load();
  expect(staleRead).not.toHaveBeenCalled();
  expect(store.getState().logs[0]?.status).toBe('done');
  expect(store.getState().ready).toBe(true);
});
