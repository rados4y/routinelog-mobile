import { createRoutine, updateRoutine } from '../domain/routine';
import type { Repositories } from './repositories';
import { referencePresets } from './presets';
import { addDays, localDate } from '../domain/dates';
import { monthStart } from '../domain/schedule/windows';

export const seedKey = '@routinelog/seed-version';
export const seedVersion = '2';

// One-time, resumable replacement explicitly requested by the owner. Existing
// logs and historical revisions are retained; later launches never reseed edits.
export async function seedOnce(
  repos: Repositories,
  now = new Date(),
): Promise<void> {
  const version = await repos.storage.getItem(seedKey);
  if (version === seedVersion) return;
  if (version !== null && version !== '1')
    throw new Error('Unsupported initial data version.');
  const existing = await repos.routines.list();
  const presetIds = new Set(referencePresets.map((item) => item.id));
  for (const routine of existing) {
    if (presetIds.has(routine.id) || routine.deletedAt) continue;
    await repos.routines.save({
      ...updateRoutine(routine, { ...routine, active: false }, now),
      deletedAt: now.toISOString(),
    });
  }
  for (const { id, input } of referencePresets) {
    if (!existing.some((routine) => routine.id === id)) {
      const routine = createRoutine(input, id, now);
      routine.sortOrder = referencePresets.findIndex((item) => item.id === id);
      // These two reference habits already have an outstanding month-end due date.
      if (id === 'preset-pawel' || id === 'preset-parents')
        routine.effectiveFrom = addDays(monthStart(localDate(now)), -1);
      await repos.routines.save(routine);
    }
  }
  await repos.storage.setItem(seedKey, seedVersion);
}
