import { createStore } from 'zustand/vanilla';
import type { Repositories } from '../data/repositories';
import { seedOnce } from '../data/seed';
import { localDate } from '../domain/dates';
import { createLog } from '../domain/log';
import type { Routine, RoutineInput, RoutineLog } from '../domain/models';
import { createRoutine, updateRoutine } from '../domain/routine';
import { occurrencesForDate } from '../domain/schedule';

export interface RoutineState {
  routines: Routine[];
  logs: RoutineLog[];
  ready: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load(): Promise<void>;
  clearError(): void;
  saveRoutine(input: RoutineInput, id?: string): Promise<boolean>;
  toggleRoutine(id: string): Promise<boolean>;
  deleteRoutine(id: string): Promise<boolean>;
  setStatus(
    id: string,
    date: string,
    status: 'done' | 'skipped' | 'pending',
  ): Promise<boolean>;
}
export function createRoutineStore(
  repos: Repositories,
  clock = () => new Date(),
  nextId = () =>
    `routine-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
) {
  return createStore<RoutineState>((set, get) => {
    const perform = async (work: () => Promise<void>): Promise<boolean> => {
      if (!get().ready || get().saving) return false;
      set({ saving: true, error: null });
      try {
        await work();
        return true;
      } catch {
        set({
          error:
            'Nie udało się zapisać zmian. Dane na ekranie nie zostały zmienione. Spróbuj ponownie.',
        });
        return false;
      } finally {
        set({ saving: false });
      }
    };
    const save = async (routine: Routine) => {
      await repos.routines.save(routine);
      set({
        routines: [
          ...get().routines.filter((item) => item.id !== routine.id),
          routine,
        ],
      });
    };
    const find = (id: string) => {
      const routine = get().routines.find((item) => item.id === id);
      if (!routine) throw new Error('Rutyna nie istnieje.');
      return routine;
    };
    return {
      routines: [],
      logs: [],
      ready: false,
      loading: false,
      saving: false,
      error: null,
      clearError: () => set({ error: null }),
      load: async () => {
        if (get().loading) return;
        set({ loading: true, error: null });
        try {
          await seedOnce(repos, clock());
          const [routines, logs] = await Promise.all([
            repos.routines.list(),
            repos.logs.list(),
          ]);
          set({ routines, logs, ready: true });
        } catch {
          set({
            error:
              'Nie udało się odczytać danych. Spróbuj ponownie. Zapisane dane nie zostały usunięte.',
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
      setStatus: (id, date, status) =>
        perform(async () => {
          if (date > localDate(clock())) throw new Error('Przyszły dzień.');
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
          const occurrence = occurrencesForDate(
            get().routines,
            get().logs,
            date,
            clock(),
          ).find((item) => item.routine.id === id);
          if (!occurrence) throw new Error('Rutyna nie jest zaplanowana.');
          const log = createLog(occurrence.routine, date, status, clock());
          if (existing) log.createdAt = existing.createdAt;
          await repos.logs.save(log);
          set({
            logs: [...get().logs.filter((item) => item.id !== log.id), log],
          });
        }),
    };
  });
}
