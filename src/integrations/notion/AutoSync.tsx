import { useEffect } from 'react';
import { AppState } from 'react-native';
import { routineStore, useRoutines } from '../../store/useRoutines';
import { useNotion } from './useNotion';

export function AutoSync() {
  const ready = useRoutines((state) => state.ready);
  const connected = useNotion((state) => state.connected);
  const initialize = useNotion((state) => state.initialize);
  useEffect(() => {
    void initialize();
  }, [initialize]);
  useEffect(() => {
    if (!ready || !connected) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      if (AppState.currentState !== 'active' || useNotion.getState().conflict)
        return;
      await useNotion.getState().sync();
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), 1800);
    };
    const unsubscribe = routineStore.subscribe((state, previous) => {
      if (useNotion.getState().busy || state.saving || !previous.saving) return;
      // The completed save follows entity updates that happened while saving=true.
      schedule();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });
    const interval = setInterval(() => void run(), 60000);
    schedule();
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
      appState.remove();
    };
  }, [ready, connected]);
  return null;
}
