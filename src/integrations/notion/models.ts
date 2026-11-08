import type { MasterGateway } from './master/models';
import { z } from 'zod';
import { routineInputSchema, type RoutineLog } from '../../domain/models';
export type { SyncLocal } from '../../data/sync';

export type CellStatus = RoutineLog['status'] | 'pending';
export type ConflictChoice = 'app' | 'notion';
export interface Column {
  id: string;
  name: string;
  description: string;
  type: string;
}
export interface MonthRef {
  month: string;
  pageId: string;
  databaseId: string;
  notesPropertyId?: string;
}
export interface MonthTable extends MonthRef {
  dataSourceId: string;
  columns: Column[];
  rows: {
    id: string;
    date: string;
    editedAt: string;
    cells: Record<string, CellStatus>;
    note?: string;
  }[];
}
export interface NotionGateway extends MasterGateway {
  listMonths(): Promise<MonthRef[]>;
  createMonth(month: string): Promise<MonthRef>;
  readMonth(ref: MonthRef): Promise<MonthTable>;
  updateColumns(
    table: MonthTable,
    patches: Record<string, unknown>,
  ): Promise<MonthTable>;
  createDay(table: MonthTable, date: string): Promise<void>;
  writeCells(rowId: string, properties: Record<string, unknown>): Promise<void>;
}
const bindingSchema = z.object({
  propertyId: z.string(),
  routineId: z.string(),
  base: routineInputSchema,
});
export const monthLedgerSchema = z.object({
  version: z.literal(1),
  databaseId: z.string(),
  bindings: z.array(bindingSchema),
  cells: z.record(z.string(), z.enum(['pending', 'done', 'skipped', 'missed'])),
  notesPropertyId: z.string().optional(),
  notes: z.record(z.string(), z.string()).default({}),
});
export type MonthLedger = z.infer<typeof monthLedgerSchema>;
export const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export class SyncConflictError extends Error {
  constructor(public label: string) {
    super(`“${label}” changed in both places. Choose which version to keep.`);
    this.name = 'SyncConflictError';
  }
}
export function mergeValue<T>(
  base: T | undefined,
  local: T,
  remote: T,
  label: string,
  choice?: ConflictChoice,
): T {
  if (equal(local, remote)) return local;
  if (base !== undefined && equal(local, base)) return remote;
  if (base !== undefined && equal(remote, base)) return local;
  // Empty initial cells are not an instruction to erase existing data.
  if (base === undefined) {
    if (local === 'pending') return remote;
    if (remote === 'pending') return local;
  }
  if (choice) return choice === 'app' ? local : remote;
  throw new SyncConflictError(label);
}
