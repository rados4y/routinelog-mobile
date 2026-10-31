import { createRoutine } from '../domain/routine';
import type { Routine, Schedule } from '../domain/models';
import type { KeyValueStorage } from '../data/repositories';

export const monday = '2026-10-12';
export function routine(schedule: Schedule = { kind: 'daily' }): Routine {
  return createRoutine(
    {
      name: 'Test rutyny',
      icon: '✅',
      category: 'Inne',
      active: true,
      schedule,
      target: null,
      unit: null,
      reminderTime: '08:00',
      note: '',
    },
    'test-routine',
    new Date(`${monday}T07:00:00`),
  );
}
export class MemoryStorage implements KeyValueStorage {
  records = new Map<string, string>();
  async getItem(key: string) {
    return this.records.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.records.set(key, value);
  }
  async removeItem(key: string) {
    this.records.delete(key);
  }
  async getAllKeys() {
    return [...this.records.keys()];
  }
}
