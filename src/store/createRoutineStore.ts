import { createStore } from 'zustand/vanilla';
import type { Repositories } from '../data/repositories';
import { seedOnce } from '../data/seed';
import { localDate } from '../domain/dates';
import { createLog } from '../domain/log';
import type {
  ChecklistResult,
  OccurrenceStatus,
  Routine,
  RoutineInput,
  RoutineLog,
} from '../domain/models';
import { createRoutine, routineOn, updateRoutine } from '../domain/routine';
import {
  ChecklistIncompleteError,
  requireCompleteChecklist,
} from '../domain/checklist';
import {
  entryBlockReason,
  EntryUnavailableError,
  routineForStatusEntry,
  type EntryMode,
} from '../domain/entry';
import type { SyncLocal } from '../data/sync';
import {
  createDailyNote,
  dailyNoteSchema,
  type DailyNote,
} from '../domain/note';

export interface RoutineState {
  routines: Routine[];
  logs: RoutineLog[];
  notes: DailyNote[];
  ready: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load(): Promise<void>;
  clearError(): void;
  applySyncedRoutine: SyncLocal['applyRoutine'];
  applySyncedLog: SyncLocal['applyLog'];
  applySyncedNote: SyncLocal['applyNote'];
  saveNote(date: string, content: string): Promise<boolean>;
  saveRoutine(input: RoutineInput, id?: string): Promise<boolean>;
  toggleRoutine(id: string): Promise<boolean>;
  deleteRoutine(id: string): Promise<boolean>;
  setStatus(
    id: string,
    date: string,
    status: OccurrenceStatus,
    checklist?: ChecklistResult[],
    mode?: EntryMode,
  ): Promise<boolean>;
}
export function createRoutineStore(
  repos: Repositories,
  clock = () => new Date(),
  nextId = () =>
    `routine-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
) {
  return createStore<RoutineState>((set, get, api) => {
    let noteWrites = Promise.resolve();
    const idle = () =>
      new Promise<void>((resolve) => {
        if (!get().saving) return resolve();
        const unsubscribe = api.subscribe((state) => {
          if (!state.saving) {
            unsubscribe();
            resolve();
          }
        });
      });
    const perform = async (work: () => Promise<void>): Promise<boolean> => {
      if (!get().ready || get().saving) return false;
      set({ saving: true, error: null });
      try {
        await work();
        return true;
      } catch (error) {
        set({
          error:
            error instanceof ChecklistIncompleteError ||
            error instanceof EntryUnavailableError
              ? error.message
              : 'Could not save changes. Your previous data is unchanged. Try again.',
        });
        return false;
      } finally {
        set({ saving: false });
      }
    };
    const save = async (routine: Routine) => {
      await repos.routines.save(routine);
      set({
        routines: get().routines.some((item) => item.id === routine.id)
          ? get().routines.map((item) =>
              item.id === routine.id ? routine : item,
            )
          : [...get().routines, routine],
      });
    };
    const find = (id: string) => {
      const routine = get().routines.find((item) => item.id === id);
      if (!routine) throw new Error('Routine does not exist.');
      return routine;
    };
    const saveNote = async (note: DailyNote) => {
      await repos.notes.save(dailyNoteSchema.parse(note));
      set({
        notes: [...get().notes.filter((item) => item.id !== note.id), note],
      });
    };
    return {
      routines: [],
      logs: [],
      notes: [],
      ready: false,
      loading: false,
      saving: false,
      error: null,
      clearError: () => set({ error: null }),
      applySyncedNote: async (expected, next) => {
        const current = get().notes.find((note) => note.id === next.id);
        if (JSON.stringify(current) !== JSON.stringify(expected)) return false;
        return perform(() => saveNote(next));
      },
      saveNote: (date, content) => {
        const task = noteWrites.then(async () => {
          await idle();
          return perform(() =>
            saveNote(
              createDailyNote(
                date,
                content,
                get().notes.find((note) => note.id === date),
                clock(),
              ),
            ),
          );
        });
        noteWrites = task.then(
          () => {},
          () => {},
        );
        return task;
      },
      applySyncedRoutine: async (expected, next) => {
        if (!get().ready || get().saving) return false;
        const current = get().routines.find((item) => item.id === next.id);
        if (JSON.stringify(current) !== JSON.stringify(expected)) return false;
        return perform(() => save(next));
      },
      applySyncedLog: async (expected, next, id) => {
        if (!get().ready || get().saving) return false;
        const current = get().logs.find((item) => item.id === id);
        if (JSON.stringify(current) !== JSON.stringify(expected)) return false;
        return perform(async () => {
          if (next?.status === 'done' && current?.status !== 'done') {
            const routine = get().routines.find(
              (item) => item.id === next.routineId,
            );
            requireCompleteChecklist(
              routine
                ? (routineOn(routine, next.scheduledFor) ?? routine).checklist
                : [],
              next.checklist,
            );
          }
          if (next) await repos.logs.save(next);
          else await repos.logs.remove(id);
          set({
            logs: [
              ...get().logs.filter((item) => item.id !== id),
              ...(next ? [next] : []),
            ],
          });
        });
      },
      load: async () => {
        // Headless widget tasks can initialize this store before the app mounts.
        // Do not reload a stale repository snapshot over their latest saved state.
        if (get().loading || get().ready) return;
        set({ loading: true, error: null });
        try {
          await seedOnce(repos, clock());
          const [routines, logs, notes] = await Promise.all([
            repos.routines.list(),
            repos.logs.list(),
            repos.notes.list(),
          ]);
          set({ routines, logs, notes, ready: true });
        } catch {
          set({
            error:
              'Could not load data. Your saved data has not been deleted. Try again.',
          });
        } finally {
          set({ loading: false });
        }
      },
      saveRoutine: (input, id) =>
        perform(async () => {
          await save(
            id
              ? updateRoutine(find(id), input, clock())
              : createRoutine(input, nextId(), clock()),
          );
        }),
      toggleRoutine: (id) =>
        perform(async () => {
          const routine = find(id);
          await save(
            updateRoutine(
              routine,
              { ...routine, active: !routine.active },
              clock(),
            ),
          );
        }),
      deleteRoutine: (id) =>
        perform(async () => {
          const routine = find(id);
          await save({
            ...updateRoutine(routine, { ...routine, active: false }, clock()),
            deletedAt: clock().toISOString(),
          });
        }),
      setStatus: (id, date, status, checklist, mode = 'scheduled') =>
        perform(async () => {
          if (date > localDate(clock()))
            throw new EntryUnavailableError(
              'Future date — you can record a status on that day or later.',
            );
          const existing = get().logs.find(
            (item) => item.routineId === id && item.scheduledFor === date,
          );
          if (status === 'pending') {
            if (existing) await repos.logs.remove(existing.id);
            set({
              logs: get().logs.filter((item) => item.id !== existing?.id),
            });
            return;
          }
          const original = find(id);
          const reason = entryBlockReason(
            original,
            date,
            mode,
            Boolean(existing),
            localDate(clock()),
          );
          if (reason) throw new EntryUnavailableError(reason);
          const routine = routineForStatusEntry(
            original,
            date,
            mode,
            Boolean(existing),
          );
          if (!routine) throw new EntryUnavailableError('Routine unavailable.');
          const log = createLog(routine, date, status, clock(), checklist);
          if (existing) {
            log.createdAt = existing.createdAt;
            log.note = existing.note;
            log.value = existing.value;
          }
          await repos.logs.save(log);
          set({
            logs: [...get().logs.filter((item) => item.id !== log.id), log],
          });
        }),
    };
  });
}
