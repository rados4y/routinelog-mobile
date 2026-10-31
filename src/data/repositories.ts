import { z } from 'zod';
import {
  logSchema,
  routineSchema,
  type Routine,
  type RoutineLog,
} from '../domain/models';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}
export interface Repository<T> {
  list(): Promise<T[]>;
  save(value: T): Promise<void>;
  remove(id: string): Promise<void>;
}
export type RoutineRepository = Repository<Routine>;
export type LogRepository = Repository<RoutineLog>;

// Versioned records, one key per entity. Corruption is reported, never silently reset.
export class StorageRepository<
  T extends { id: string },
> implements Repository<T> {
  constructor(
    private storage: KeyValueStorage,
    private prefix: string,
    private schema: z.ZodType<T>,
  ) {}
  async list(): Promise<T[]> {
    const keys = (await this.storage.getAllKeys()).filter((key) =>
      key.startsWith(this.prefix),
    );
    const values = await Promise.all(
      keys.map((key) => this.storage.getItem(key)),
    );
    const records: T[] = [];
    for (const raw of values) {
      if (raw === null) continue;
      const envelope = z
        .object({ version: z.literal(1), data: z.unknown() })
        .parse(JSON.parse(raw));
      records.push(this.schema.parse(envelope.data));
    }
    return records;
  }
  async save(value: T): Promise<void> {
    const data = this.schema.parse(value);
    await this.storage.setItem(
      `${this.prefix}${data.id}`,
      JSON.stringify({ version: 1, data }),
    );
  }
  async remove(id: string): Promise<void> {
    await this.storage.removeItem(`${this.prefix}${id}`);
  }
}
export function repositories(storage: KeyValueStorage) {
  return {
    routines: new StorageRepository(
      storage,
      '@routinelog/v1/routine/',
      routineSchema,
    ),
    logs: new StorageRepository(storage, '@routinelog/v1/log/', logSchema),
    storage,
  };
}
export interface Repositories {
  routines: RoutineRepository;
  logs: LogRepository;
  storage: KeyValueStorage;
}
