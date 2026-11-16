import { describe, expect, it, vi } from 'vitest';
import { repositories } from '../data/repositories';
import { createRoutineStore } from '../store/createRoutineStore';
import { MemoryStorage } from '../test/fixtures';
import {
  toggleTaskFromWidget,
  postponeTaskFromWidget,
} from '../widgets/actions';
import { todayWidgetModel } from '../widgets/model';
import { createTask, taskSchema, tasksForDate, taskHighlights } from './task';

const day = '2026-11-15';
const clock = () => new Date(`${day}T12:00:00`);
async function setup() {
  const repos = repositories(new MemoryStorage());
  const store = createRoutineStore(repos, clock);
  await store.getState().load();
  return { repos, store };
}
describe('one-off daily tasks', () => {
  it('moves the same task across a month boundary, persists and only undoes an unchanged move', async () => {
    const { repos, store } = await setup();
    await store.getState().saveTask('2026-12-31', 'Keep my description');
    const before = store.getState().tasks[0]!;
    expect(await store.getState().postponeTask(before.id, before.date)).toBe(
      true,
    );
    const moved = store.getState().tasks[0]!;
    expect(moved).toMatchObject({ ...before, date: '2027-01-01' });
    expect(store.getState().tasks).toHaveLength(1);
    const restarted = createRoutineStore(repos, clock);
    await restarted.getState().load();
    expect(restarted.getState().tasks[0]).toEqual(moved);
    expect(
      await restarted.getState().postponeTask(before.id, before.date),
    ).toBe(false);
    expect(
      await restarted.getState().undoTaskPostpone(moved, before.date),
    ).toBe(true);
    await restarted.getState().postponeTask(before.id, before.date);
    const next = restarted.getState().tasks[0]!;
    await restarted.getState().saveTask(next.date, 'Newer edit', next.id);
    expect(await restarted.getState().undoTaskPostpone(next, before.date)).toBe(
      false,
    );
    expect(restarted.getState().tasks[0]?.description).toBe('Newer edit');
  });
  it('only marks unfinished past tasks as missed and allows note/done/missed markers together', () => {
    const pending = createTask('pending', '2026-11-14', 'Pending', clock());
    const done = { ...pending, id: 'done', done: true };
    const deleted = {
      ...pending,
      id: 'deleted',
      date: '2026-11-13',
      deletedAt: clock().toISOString(),
    };
    const highlights = taskHighlights(
      [
        pending,
        done,
        deleted,
        { ...pending, id: 'today', date: day },
        { ...pending, id: 'future', date: '2026-11-16' },
      ],
      day,
    );
    expect([...highlights.missedTaskDates]).toEqual(['2026-11-14']);
    expect([...highlights.doneTaskDates]).toEqual(['2026-11-14']);
  });
  it('postpone rejects completed tasks and stale widget clicks and survives failed persistence', async () => {
    const { repos, store } = await setup();
    await store.getState().saveTask(day, 'Today');
    const task = store.getState().tasks[0]!;
    await store.getState().setTaskDone(task.id, true);
    expect(await store.getState().postponeTask(task.id, day)).toBe(false);
    await store.getState().setTaskDone(task.id, false);
    vi.spyOn(repos.tasks, 'save').mockRejectedValueOnce(new Error('Disk full'));
    expect(await store.getState().postponeTask(task.id, day)).toBe(false);
    expect(store.getState().tasks[0]?.date).toBe(day);
    const payload = { taskId: task.id, date: day, expectedDone: false };
    expect(
      await postponeTaskFromWidget(store.getState(), payload, clock()),
    ).toBe('saved');
    expect(
      await postponeTaskFromWidget(store.getState(), payload, clock()),
    ).toBe('unavailable');
    expect(
      await postponeTaskFromWidget(
        store.getState(),
        { ...payload, date: '2026-11-16' },
        clock(),
      ),
    ).toBe('stale');
  });
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
