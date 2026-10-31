import { describe, expect, it } from 'vitest';
import { MemoryStorage, routine } from '../test/fixtures';
import { repositories } from './repositories';
import { seedOnce } from './seed';

describe('versioned record repositories', () => {
  it('persists across repository instances and isolates entity namespaces', async () => {
    const storage = new MemoryStorage();
    const r = routine();
    await repositories(storage).routines.save(r);
    const reloaded = repositories(storage);
    expect(await reloaded.routines.list()).toEqual([r]);
    expect(await reloaded.logs.list()).toEqual([]);
    await reloaded.routines.save({ ...r, name: 'Nowa nazwa' });
    expect(await reloaded.routines.list()).toHaveLength(1);
    await reloaded.routines.remove(r.id);
    expect(await reloaded.routines.list()).toEqual([]);
  });
  it('reports corrupt and unsupported data without overwriting it', async () => {
    const storage = new MemoryStorage();
    const key = '@routinelog/v1/routine/bad';
    await storage.setItem(key, '{"version":2,"data":{}}');
    await expect(repositories(storage).routines.list()).rejects.toThrow();
    expect(await storage.getItem(key)).toContain('"version":2');
  });
  it('seeds once, preserving edits and deletions after subsequent launches', async () => {
    const repos = repositories(new MemoryStorage());
    await seedOnce(repos);
    const first = (await repos.routines.list())[0]!;
    await repos.routines.save({ ...first, name: 'Moja rutyna' });
    await seedOnce(repos);
    expect(await repos.routines.list()).toHaveLength(5);
    expect(
      (await repos.routines.list()).find((r) => r.id === first.id)?.name,
    ).toBe('Moja rutyna');
    await repos.routines.remove(first.id);
    await seedOnce(repos);
    expect(await repos.routines.list()).toHaveLength(4);
  });
  it('recovers a partial seed without duplicating records', async () => {
    const repos = repositories(new MemoryStorage());
    await repos.routines.save({ ...routine(), id: 'seed-1', name: 'Zachowaj' });
    await seedOnce(repos);
    expect(await repos.routines.list()).toHaveLength(5);
    expect(
      (await repos.routines.list()).find((r) => r.id === 'seed-1')?.name,
    ).toBe('Zachowaj');
  });
});
