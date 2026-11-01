import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import project from '../../../notion-project.json';
import { routineStore } from '../../store/useRoutines';
import { NotionClient } from './client';
import { credentials } from './credentials';
import { HttpNotionGateway } from './gateway';
import { SyncConflictError, type ConflictChoice } from './models';
import { NotionSync } from './sync';

const lastSyncKey = '@routinelog/notion/last-success';
interface NotionState {
  initialized: boolean;
  connected: boolean;
  busy: boolean;
  error: string | null;
  conflict: boolean;
  lastSuccess: string | null;
  initialize(): Promise<void>;
  connect(token: string): Promise<boolean>;
  disconnect(): Promise<void>;
  sync(choice?: ConflictChoice): Promise<void>;
}
export const notionPageUrl = `https://www.notion.so/${project.rootPageId.replaceAll('-', '')}`;
export const useNotion = create<NotionState>((set, get) => ({
  initialized: false,
  connected: false,
  busy: false,
  error: null,
  conflict: false,
  lastSuccess: null,
  initialize: async () => {
    if (get().initialized) return;
    try {
      const token = await credentials.get();
      set({
        connected: Boolean(token),
        lastSuccess: await AsyncStorage.getItem(lastSyncKey),
        initialized: true,
      });
    } catch {
      set({
        initialized: true,
        error: 'Nie udało się odczytać połączenia Notion. Połącz ponownie.',
      });
    }
  },
  connect: async (token) => {
    if (get().busy) return false;
    set({ busy: true, error: null, conflict: false });
    try {
      const client = new NotionClient(token.trim());
      await client.call(`pages/${project.rootPageId}`);
      await credentials.set(token.trim());
      set({ connected: true });
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Nie udało się połączyć z Notion.',
      });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  disconnect: async () => {
    if (get().busy) return;
    try {
      await credentials.remove();
      set({ connected: false, error: null, conflict: false });
    } catch {
      set({ error: 'Nie udało się rozłączyć. Spróbuj ponownie.' });
    }
  },
  sync: async (choice) => {
    if (
      get().busy ||
      !get().connected ||
      !routineStore.getState().ready ||
      routineStore.getState().saving
    )
      return;
    set({ busy: true, error: null, conflict: false });
    try {
      const token = await credentials.get();
      if (!token) {
        set({ connected: false });
        return;
      }
      const sync = new NotionSync(
        project.rootPageId,
        new HttpNotionGateway(new NotionClient(token), project.rootPageId),
        {
          read: () => routineStore.getState(),
          applyRoutine: (expected, next) =>
            routineStore.getState().applySyncedRoutine(expected, next),
          applyLog: (expected, next, id) =>
            routineStore.getState().applySyncedLog(expected, next, id),
        },
        AsyncStorage,
      );
      await sync.run(choice);
      const lastSuccess = new Date().toISOString();
      await AsyncStorage.setItem(lastSyncKey, lastSuccess);
      set({ lastSuccess });
    } catch (error) {
      set({
        conflict: error instanceof SyncConflictError,
        error:
          error instanceof Error && !(error.name === 'ZodError')
            ? error.message
            : 'Nieprawidłowe dane synchronizacji. Lokalne dane pozostały zapisane.',
      });
    } finally {
      set({ busy: false });
    }
  },
}));
