import { useEffect } from 'react';
import { AppState } from 'react-native';
import { routineStore } from '../store/useRoutines';
import { isWidgetAvailable, refreshWidgets } from './bridge';

export function WidgetAutoRefresh() {
  useEffect(() => {
    if (!isWidgetAvailable()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = undefined;
      void refreshWidgets().catch(() => {
        /* A launcher failure must not block a local save. */
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 200);
    };
    let contentChanged = false;
    let foregroundWrite = false;
    const unsubscribe = routineStore.subscribe((state, previous) => {
      if (
        state.saving &&
        !previous.saving &&
        AppState.currentState === 'active'
      )
        foregroundWrite = true;
      if (
        state.logs !== previous.logs ||
        state.routines !== previous.routines ||
        state.notes !== previous.notes ||
        state.tasks !== previous.tasks
      )
        contentChanged = true;
      if (
        state.ready &&
        !state.saving &&
        contentChanged &&
        (AppState.currentState === 'active' || foregroundWrite)
      ) {
        contentChanged = false;
        if (AppState.currentState === 'active') schedule();
        else refresh();
      }
      if (!state.saving) foregroundWrite = false;
    });
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
      // Android can pause JS timers as soon as Home is pressed. Flush an app
      // save's queued refresh now; a headless widget action has no queued timer.
      else if (timer !== undefined) refresh();
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
