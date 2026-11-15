import { describe, expect, it, vi } from 'vitest';
import { createTask } from '../../../domain/task';
import { monday } from '../../../test/fixtures';
import { setup } from '../testFixtures';

describe('Notion daily task synchronization', () => {
  it('syncs creation, description edits, completion, undo and deletion in both directions', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().saveTask(monday, 'Local task');
    await sync().run();
    const row = remote.tasks.rows[0]!;
    expect(row.value).toMatchObject({
      description: 'Local task',
      done: false,
      date: monday,
    });
    row.value.description = 'Edited in Notion';
    row.value.done = true;
    await sync().run();
    expect(store.getState().tasks[0]).toMatchObject({
      description: 'Edited in Notion',
      done: true,
    });
    await store.getState().setTaskDone(row.id, false);
    await sync().run();
    expect(remote.tasks.rows[0]?.value.done).toBe(false);
    await store.getState().deleteTask(row.id);
    await sync().run();
    expect(remote.tasks.rows[0]?.value.archived).toBe(true);
    remote.tasks.rows.push({
      id: 'notion-new',
      pageId: 'remote-page',
      value: {
        date: monday,
        description: 'Created in Notion',
        done: false,
        archived: false,
      },
      createdAt: `${monday}T10:00:00Z`,
      updatedAt: `${monday}T10:00:00Z`,
    });
    await sync().run();
    expect(
      store.getState().tasks.find((task) => task.id === 'notion-new')
        ?.description,
    ).toBe('Created in Notion');
    remote.tasks.rows = remote.tasks.rows.filter(
      (item) => item.id !== 'notion-new',
    );
    await sync().run();
    expect(
      store.getState().tasks.find((task) => task.id === 'notion-new')
        ?.deletedAt,
    ).toBeTruthy();
    expect(
      remote.tasks.rows.find((item) => item.id === 'notion-new')?.value
        .archived,
    ).toBe(true);
  });
  it('merges independent edits and surfaces conflicting descriptions without discarding either side', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().saveTask(monday, 'Initial');
    await sync().run();
    const row = remote.tasks.rows[0]!;
    await store.getState().saveTask(monday, 'Phone edit', row.id);
    row.value.done = true;
    await sync().run();
    expect(store.getState().tasks[0]).toMatchObject({
      description: 'Phone edit',
      done: true,
    });
    await store.getState().saveTask(monday, 'Another phone edit', row.id);
    remote.tasks.rows[0]!.value.description = 'Notion edit';
    await expect(sync().run()).rejects.toThrow('changed in both places');
    expect(store.getState().tasks[0]?.description).toBe('Another phone edit');
    expect(remote.tasks.rows[0]?.value.description).toBe('Notion edit');
    await sync().run('app');
    expect(remote.tasks.rows[0]?.value.description).toBe('Another phone edit');
  });
  it('refuses changed identities, replaced databases, partial listings and early future completions', async () => {
    const { store, remote, sync } = await setup();
    await store.getState().saveTask(monday, 'Protected');
    await sync().run();
    const original = remote.tasks.rows[0]!.id;
    remote.tasks.rows[0]!.id = 'changed-id';
    await expect(sync().run()).rejects.toThrow('Task ID changed');
    remote.tasks.rows[0]!.id = original;
    remote.tasks.databaseId = 'replacement';
    await expect(sync().run()).rejects.toThrow('replaced');
    remote.tasks.databaseId = 'tasks-db';
    vi.spyOn(remote, 'readTasks').mockRejectedValueOnce(
      new Error('partial listing'),
    );
    await expect(sync().run()).rejects.toThrow('partial listing');
    expect(store.getState().tasks[0]?.deletedAt).toBeNull();
    remote.tasks.rows[0]!.value = {
      ...remote.tasks.rows[0]!.value,
      date: '2026-10-13',
      done: true,
    };
    await expect(sync().run()).rejects.toThrow('future task');
    expect(store.getState().tasks[0]?.done).toBe(false);
  });
  it('keeps a concurrent local edit made during a network write', async () => {
    const { store, repos, remote, sync } = await setup();
    const original = createTask(
      'race',
      monday,
      'Original',
      new Date(`${monday}T10:00:00`),
    );
    await repos.tasks.save(original);
    await store.getState().applySyncedTask(undefined, original);
    await sync().run();
    await store.getState().saveTask(monday, 'Phone edit', original.id);
    remote.tasks.rows[0]!.value.done = true;
    const write = remote.writeTask.bind(remote);
    vi.spyOn(remote, 'writeTask').mockImplementationOnce(async (...args) => {
      await store.getState().saveTask(monday, 'Newer typing', original.id);
      return write(...args);
    });
    await expect(sync().run()).rejects.toThrow('newer local edit');
    expect(store.getState().tasks[0]?.description).toBe('Newer typing');
  });
});
