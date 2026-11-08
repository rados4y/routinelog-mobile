import { z } from 'zod';
import {
  checklistSchema,
  routineInputSchema,
  type RoutineInput,
} from '../../../domain/models';

export const masterMarker = 'RoutineLog routines (v2)';
export const masterReadyMarker = `${masterMarker}\nMigration: complete`;
export interface MasterRow {
  pageId: string;
  routineId: string;
  input: RoutineInput;
  archived: boolean;
  createdDate: string;
  needsIdentityWrite?: boolean;
}
export interface MasterTable {
  databaseId: string;
  dataSourceId: string;
  initialized: boolean;
  rows: MasterRow[];
}
export const masterValueSchema = routineInputSchema.safeExtend({
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
  checklist: checklistSchema,
  archived: z.boolean(),
});
export type MasterValue = z.infer<typeof masterValueSchema>;
export interface MasterGateway {
  readRoutines(): Promise<MasterTable>;
  writeRoutine(
    table: MasterTable,
    routineId: string,
    value: MasterValue,
    pageId?: string,
  ): Promise<string>;
  finishRoutineMigration(table: MasterTable): Promise<void>;
}
export const masterLedgerSchema = z.object({
  version: z.literal(2),
  databaseId: z.string(),
  bindings: z.record(
    z.string(),
    z.object({ pageId: z.string(), base: masterValueSchema }),
  ),
});
export type MasterLedger = z.infer<typeof masterLedgerSchema>;
