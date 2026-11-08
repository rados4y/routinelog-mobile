import { useStore } from 'zustand';
import {
  createNoteDraftStore,
  type NoteDraftState,
} from './createNoteDraftStore';
import { routineStore } from './useRoutines';

export const noteDraftStore = createNoteDraftStore((date, content) =>
  routineStore.getState().saveNote(date, content),
);
export function useNoteDrafts<T>(selector: (state: NoteDraftState) => T): T {
  return useStore(noteDraftStore, selector);
}
