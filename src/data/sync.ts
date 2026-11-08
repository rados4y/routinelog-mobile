import type { Routine, RoutineLog } from '../domain/models';
import type { DailyNote } from '../domain/note';

export interface LocalData {
  routines: Routine[];
  logs: RoutineLog[];
  notes: DailyNote[];
}
export interface SyncLocal {
  read(): LocalData;
  applyNote(expected: DailyNote | undefined, next: DailyNote): Promise<boolean>;
  // Compare-and-save protects an edit made while a network request was in flight.
  applyRoutine(expected: Routine | undefined, next: Routine): Promise<boolean>;
  applyLog(
    expected: RoutineLog | undefined,
    next: RoutineLog | undefined,
    id: string,
  ): Promise<boolean>;
}
