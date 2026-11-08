import { useEffect } from 'react';
import { AppState } from 'react-native';
import { routineStore } from '../store/useRoutines';
import { isWidgetAvailable, refreshWidgets } from './bridge';

export function WidgetAutoRefresh() {
  useEffect(() => {
    if (!isWidgetAvailable()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      void refreshWidgets().catch(() => {
        /* A launcher failure must not block a local save. */
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 200);
    };
    let routinesChanged = false;
    const unsubscribe = routineStore.subscribe((state, previous) => {
      if (state.logs !== previous.logs || state.routines !== previous.routines)
        routinesChanged = true;
      if (state.ready && !state.saving && routinesChanged) {
        routinesChanged = false;
        schedule();
      }
    });
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') schedule();
    }, 60000);
    schedule();
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
      listener.remove();
    };
  }, []);
  return null;
}
