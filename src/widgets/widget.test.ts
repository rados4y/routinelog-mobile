import { describe, expect, it, vi } from 'vitest';
import { repositories } from '../data/repositories';
import { createRoutineStore } from '../store/createRoutineStore';
import { MemoryStorage, routine } from '../test/fixtures';
import { createLog } from '../domain/log';
import { localDate } from '../domain/dates';
import { todayWidgetModel } from './model';
import { cycleFromWidget } from './actions';

const clock = () => new Date('2026-11-04T12:00:00');
const today = localDate(clock());
async function setup(checklist = false) {
  const storage = new MemoryStorage();
  await storage.setItem('@routinelog/seed-version', '2');
  const repos = repositories(storage);
  const r = {
    ...routine(),
    name: 'Widget routine',
    ...(checklist
      ? { checklist: [{ id: 'step', text: 'Required step' }] }
      : {}),
  };
  await repos.routines.save(r);
  const store = createRoutineStore(repos, clock);
  await store.getState().load();
  return { repos, store, r };
}
describe('today widget projection and actions', () => {
  it('uses the same current-day plan and does not carry yesterday’s completion forward', () => {
    const r = routine();
    const yesterday = createLog(r, '2026-11-03', 'done', clock());
    const model = todayWidgetModel([r], [yesterday], clock());
    expect(model).toMatchObject({ date: today, done: 0 });
    expect(model.items).toHaveLength(1);
    expect(model.items[0]).toMatchObject({
      status: 'pending',
      click: { date: today, expectedStatus: 'pending' },
    });
    expect(
      todayWidgetModel([{ ...r, active: false }], [], clock()).items,
    ).toEqual([]);
  });
  it('persists the entire status cycle through the repository and refreshes the projected status', async () => {
    const { repos, store, r } = await setup();
    for (const status of ['done', 'missed', 'skipped', 'pending'] as const) {
      const state = store.getState();
      const click = todayWidgetModel(state.routines, state.logs, clock())
        .items[0]!.click;
      expect(await cycleFromWidget(state, click, clock())).toBe('saved');
      const reload = createRoutineStore(repos, clock);
      await reload.getState().load();
      expect(
        reload.getState().logs.find((log) => log.routineId === r.id)?.status ??
          'pending',
      ).toBe(status);
      const next = todayWidgetModel(
        store.getState().routines,
        store.getState().logs,
        clock(),
      );
      expect(next.items[0]?.status).toBe(status);
    }
    expect(await repos.logs.list()).toEqual([]);
  });
  it('ignores double taps, out-of-date widget instances and clicks from before midnight', async () => {
    const { store, r } = await setup();
    const click = { routineId: r.id, date: today, expectedStatus: 'pending' };
    expect(await cycleFromWidget(store.getState(), click, clock())).toBe(
      'saved',
    );
    expect(await cycleFromWidget(store.getState(), click, clock())).toBe(
      'stale',
    );
    expect(store.getState().logs[0]?.status).toBe('done');
    expect(
      await cycleFromWidget(
        store.getState(),
        { ...click, date: '2026-11-03' },
        clock(),
      ),
    ).toBe('stale');
    expect(
      await cycleFromWidget(
        store.getState(),
        { ...click, date: '2026-11-05' },
        clock(),
      ),
    ).toBe('stale');
    expect(store.getState().logs).toHaveLength(1);
  });
  it('opens checklists in the app and cannot complete required steps in the background', async () => {
    const { store, r } = await setup(true);
    const item = todayWidgetModel(store.getState().routines, [], clock())
      .items[0]!;
    expect(item.requiresChecklist).toBe(true);
    const url = new URL(item.checklistUrl);
    expect(url.searchParams.get('routineId')).toBe(r.id);
    expect(url.searchParams.get('date')).toBe(today);
    expect(await cycleFromWidget(store.getState(), item.click, clock())).toBe(
      'checklist',
    );
    expect(store.getState().logs).toEqual([]);
    await store
      .getState()
      .setStatus(r.id, today, 'done', [
        { id: 'step', text: 'Required step', checked: true },
      ]);
    const completed = todayWidgetModel(
      store.getState().routines,
      store.getState().logs,
      clock(),
    ).items[0]!;
    expect(completed.requiresChecklist).toBe(false);
    expect(
      await cycleFromWidget(store.getState(), completed.click, clock()),
    ).toBe('saved');
    expect(store.getState().logs[0]?.status).toBe('missed');
  });
  it('does not mutate a missing routine, malformed payload or busy store', async () => {
    const { store, r } = await setup();
    const click = { routineId: r.id, date: today, expectedStatus: 'pending' };
    expect(await cycleFromWidget(store.getState(), {}, clock())).toBe('stale');
    expect(
      await cycleFromWidget(
        store.getState(),
        { ...click, routineId: 'missing' },
        clock(),
      ),
    ).toBe('unavailable');
    expect(
      await cycleFromWidget(
        { ...store.getState(), saving: true },
        click,
        clock(),
      ),
    ).toBe('busy');
    expect(store.getState().logs).toEqual([]);
  });
  it('reports storage failure without falsely marking the routine complete', async () => {
    const { repos, store, r } = await setup();
    vi.spyOn(repos.logs, 'save').mockRejectedValueOnce(
      new Error('Storage full'),
    );
    expect(
      await cycleFromWidget(
        store.getState(),
        { routineId: r.id, date: today, expectedStatus: 'pending' },
        clock(),
      ),
    ).toBe('error');
    expect(store.getState().logs).toEqual([]);
    expect(await repos.logs.list()).toEqual([]);
  });
});
