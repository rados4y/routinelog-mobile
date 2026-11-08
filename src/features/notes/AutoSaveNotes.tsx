import { useEffect } from 'react';
import { AppState } from 'react-native';
import { noteDraftStore } from '../../store/useNoteDrafts';

export function AutoSaveNotes() {
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void noteDraftStore.getState().flush();
    });
    return () => {
      listener.remove();
      void noteDraftStore.getState().flush();
    };
  }, []);
  return null;
}
