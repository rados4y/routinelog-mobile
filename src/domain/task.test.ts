import { describe, expect, it, vi } from 'vitest';
import { repositories } from '../data/repositories';
import { createRoutineStore } from '../store/createRoutineStore';
import { MemoryStorage } from '../test/fixtures';
import { toggleTaskFromWidget } from '../widgets/actions';
import { todayWidgetModel } from '../widgets/model';
import { createTask, taskSchema, tasksForDate } from './task';

const day = '2026-11-15';
const clock = () => new Date(`${day}T12:00:00`);
async function setup() {
  const repos = repositories(new MemoryStorage());
  const store = createRoutineStore(repos, clock);
  await store.getState().load();
  return { repos, store };
}
describe('one-off daily tasks', () => {
  it('needs only a non-empty description and never rolls tasks forward or marks them missed', () => {
    const task = createTask('task', day, '  Call the garage  ', clock());
    expect(task.description).toBe('Call the garage');
    expect(tasksForDate([task], day)).toEqual([task]);
    expect(tasksForDate([task], '2026-11-16')).toEqual([]);
    expect(task.done).toBe(false);
    expect(() => createTask('empty', day, ' \n ', clock())).toThrow();
    expect(
      taskSchema.safeParse({ ...task, description: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });
  it('persists descriptions, completion, undo and deletion independently of routines and notes', async () => {
    const { repos, store } = await setup();
    expect(await store.getState().saveTask(day, 'Collect parcel')).toBe(true);
    const task = store.getState().tasks[0]!;
    await store.getState().saveTask(day, 'Collect two parcels', task.id);
    expect(await store.getState().setTaskDone(task.id, true)).toBe(true);
    const restarted = createRoutineStore(repos, clock);
    await restarted.getState().load();
    expect(restarted.getState().tasks[0]).toMatchObject({
      description: 'Collect two parcels',
      done: true,
      date: day,
    });
    await restarted.getState().setTaskDone(task.id, false);
    expect((await repos.tasks.list())[0]?.done).toBe(false);
    await restarted.getState().deleteTask(task.id);
    expect(tasksForDate(await repos.tasks.list(), day)).toEqual([]);
    expect((await repos.tasks.list())[0]?.deletedAt).toBeTruthy();
    expect(await repos.logs.list()).toEqual([]);
    expect(await repos.notes.list()).toEqual([]);
  });
  it('allows future planning, blocks early completion, and prevents edits changing the assigned date', async () => {
    const { store } = await setup();
    await store.getState().saveTask('2026-11-16', 'Buy bread');
    const task = store.getState().tasks[0]!;
    expect(await store.getState().setTaskDone(task.id, true)).toBe(false);
    await store.getState().saveTask(day, 'Buy milk', task.id);
    expect(store.getState().tasks[0]).toMatchObject({
      date: '2026-11-16',
      description: 'Buy milk',
      done: false,
    });
    expect(await store.getState().saveTask('2026-11-14', 'Past creation')).toBe(
      false,
    );
  });
  it('keeps previous data after a failed write and rejects stale synchronization', async () => {
    const { repos, store } = await setup();
    await store.getState().saveTask(day, 'Original');
    const before = store.getState().tasks[0]!;
    vi.spyOn(repos.tasks, 'save').mockRejectedValueOnce(new Error('disk full'));
    expect(await store.getState().saveTask(day, 'Unsaved', before.id)).toBe(
      false,
    );
    expect(store.getState().tasks[0]).toEqual(before);
    await store.getState().saveTask(day, 'Newer', before.id);
    expect(
      await store
        .getState()
        .applySyncedTask(before, { ...before, description: 'Remote' }),
    ).toBe(false);
    expect(store.getState().tasks[0]?.description).toBe('Newer');
  });
  it('widget toggles today only, rejects repeated stale taps and keeps task text out of links', async () => {
    const { store } = await setup();
    await store.getState().saveTask(day, 'Private task 💛');
    const model = () =>
      todayWidgetModel([], [], clock(), day, [], store.getState().tasks);
    const click = model().tasks[0]!.click;
    expect(model().tasks[0]?.openUrl).not.toContain('Private');
    expect(await toggleTaskFromWidget(store.getState(), click, clock())).toBe(
      'saved',
    );
    expect(await toggleTaskFromWidget(store.getState(), click, clock())).toBe(
      'stale',
    );
    expect(
      await toggleTaskFromWidget(
        store.getState(),
        { ...click, date: '2026-11-14' },
        clock(),
      ),
    ).toBe('stale');
    expect(
      await toggleTaskFromWidget(
        store.getState(),
        model().tasks[0]!.click,
        clock(),
      ),
    ).toBe('saved');
    expect(store.getState().tasks[0]?.done).toBe(false);
  });
});
