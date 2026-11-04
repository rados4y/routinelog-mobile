import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { routineStore } from '../store/useRoutines';
import { TodayWidget } from './TodayWidget';
import { todayWidgetModel, widgetName } from './model';
import { cycleFromWidget } from './actions';
import { refreshWidgets } from './bridge';

function waitForIdle(): Promise<boolean> {
  if (!routineStore.getState().saving && !routineStore.getState().loading)
    return Promise.resolve(true);
  return new Promise((resolve) => {
    const finish = (result: boolean) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(result);
    };
    const unsubscribe = routineStore.subscribe((state) => {
      if (!state.saving && !state.loading) finish(true);
    });
    const timer = setTimeout(() => finish(false), 5000);
  });
}
export async function widgetTaskHandler(
  props: WidgetTaskHandlerProps,
): Promise<void> {
  if (
    props.widgetInfo.widgetName !== widgetName ||
    props.widgetAction === 'WIDGET_DELETED'
  )
    return;
  let notice: string | undefined;
  try {
    if (!(await waitForIdle()))
      notice = 'Saving changes. Tap refresh in a moment.';
    else {
      if (!routineStore.getState().ready) await routineStore.getState().load();
      if (
        props.widgetAction === 'WIDGET_CLICK' &&
        props.clickAction === 'cycle'
      ) {
        const result = await cycleFromWidget(
          routineStore.getState(),
          props.clickActionData,
        );
        if (result === 'checklist')
          notice = 'Tap the routine to confirm its checklist in the app.';
        else if (result === 'error' || result === 'unavailable')
          notice = 'Open RoutineLog to review this routine.';
        else if (result === 'busy')
          notice = 'Saving changes. Tap refresh in a moment.';
      }
    }
    const state = routineStore.getState();
    if (!state.ready) notice = 'Open RoutineLog to load your saved routines.';
    props.renderWidget(
      <TodayWidget
        model={todayWidgetModel(state.routines, state.logs)}
        notice={notice}
      />,
    );
    await refreshWidgets(notice);
  } catch {
    props.renderWidget(
      <TodayWidget
        model={todayWidgetModel([], [])}
        notice="Could not refresh. Open RoutineLog to try again."
      />,
    );
  }
}
