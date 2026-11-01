import type { Routine, RoutineLog } from '../domain/models';

export interface LocalData {
  routines: Routine[];
  logs: RoutineLog[];
}
export interface SyncLocal {
  read(): LocalData;
  // Compare-and-save protects an edit made while a network request was in flight.
  applyRoutine(expected: Routine | undefined, next: Routine): Promise<boolean>;
  applyLog(
    expected: RoutineLog | undefined,
    next: RoutineLog | undefined,
    id: string,
  ): Promise<boolean>;
}
