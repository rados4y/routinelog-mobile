import { describe, expect, it, vi } from 'vitest';
import { createLog } from '../domain/log';
import { occurrencesForDate } from '../domain/schedule';
import { routine, MemoryStorage } from '../test/fixtures';
import { repositories } from './repositories';
import { seedOnce, seedKey, seedVersion } from './seed';

const now = new Date('2026-11-02T12:00:00');
describe('reference routine migration', () => {
  it('creates all five named presets, with three pending on the reference Monday', async () => {
    const repos = repositories(new MemoryStorage());
    await seedOnce(repos, now);
    const routines = await repos.routines.list();
    expect(routines).toHaveLength(5);
    expect(routines.map((r) => r.name)).toContain(
      'Book: umysł ponad nastrojem',
    );
    expect(
      occurrencesForDate(routines, [], '2026-11-02', now).map(
        (item) => item.routine.id,
      ),
    ).toEqual(['preset-pawel', 'preset-parents', 'preset-dog']);
  });
  it('archives the previous routines and preserves their completion history', async () => {
    const repos = repositories(new MemoryStorage());
    const old = routine();
    const log = createLog(old, '2026-10-12', 'done', now);
    await repos.routines.save(old);
    await repos.logs.save(log);
    await repos.storage.setItem(seedKey, '1');
    await seedOnce(repos, now);
    expect(
      (await repos.routines.list()).filter((r) => !r.deletedAt),
    ).toHaveLength(5);
    expect(
      (await repos.routines.list()).find((r) => r.id === old.id),
    ).toMatchObject({ active: false, deletedAt: now.toISOString() });
    expect(await repos.logs.list()).toEqual([log]);
    expect(await repos.storage.getItem(seedKey)).toBe(seedVersion);
  });
  it('recovers a partial replacement without duplicating or overwriting imported presets', async () => {
    const repos = repositories(new MemoryStorage());
    const save = repos.routines.save.bind(repos.routines);
    let calls = 0;
    vi.spyOn(repos.routines, 'save').mockImplementation(async (value) => {
      if (++calls === 3) throw new Error('disk full');
      await save(value);
    });
    await expect(seedOnce(repos, now)).rejects.toThrow('disk full');
    await seedOnce(repos, now);
    expect(
      (await repos.routines.list()).filter((r) => !r.deletedAt),
    ).toHaveLength(5);
    const first = (await repos.routines.list())[0]!;
    await repos.routines.save({ ...first, name: 'Moja zmiana' });
    await seedOnce(repos, now);
    expect(
      (await repos.routines.list()).find((r) => r.id === first.id)?.name,
    ).toBe('Moja zmiana');
  });
});
