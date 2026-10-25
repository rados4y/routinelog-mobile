import { localDate } from '../domain/dates';
import { createRoutine } from '../domain/routine';
import type { RoutineInput } from '../domain/models';
import type { Repositories } from './repositories';

const seedKey = '@routinelog/seed-version';
export async function seedOnce(
  repos: Repositories,
  now = new Date(),
): Promise<void> {
  if (await repos.storage.getItem(seedKey)) return;
  const base = { active: true, target: null, unit: null, note: '' };
  const inputs: RoutineInput[] = [
    {
      ...base,
      name: 'Wziąć lek',
      icon: '💊',
      category: 'Zdrowie',
      schedule: { kind: 'daily' },
      reminderTime: '08:00',
      note: 'Po śniadaniu',
    },
    {
      ...base,
      name: 'Witamina D',
      icon: '💧',
      category: 'Zdrowie',
      schedule: { kind: 'daily' },
      reminderTime: '08:00',
    },
    {
      ...base,
      name: 'Mobility 15 min',
      icon: '🧘',
      category: 'Sport',
      schedule: { kind: 'weeklyTarget', count: 3 },
      reminderTime: '20:00',
    },
    {
      ...base,
      name: 'Telefon do rodziców',
      icon: '☎️',
      category: 'Rodzina',
      schedule: { kind: 'weeklyTarget', count: 1 },
      reminderTime: '19:00',
    },
    {
      ...base,
      name: 'Podlać kwiaty',
      icon: '🪴',
      category: 'Dom',
      schedule: { kind: 'interval', every: 7, anchor: localDate(now) },
      reminderTime: '18:00',
    },
  ];
  const existing = new Set(
    (await repos.routines.list()).map((routine) => routine.id),
  );
  for (const [index, input] of inputs.entries()) {
    const id = `seed-${index + 1}`;
    if (!existing.has(id))
      await repos.routines.save(createRoutine(input, id, now));
  }
  await repos.storage.setItem(seedKey, '1');
}
