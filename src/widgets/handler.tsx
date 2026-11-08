import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { routineStore } from '../store/useRoutines';
import { TodayWidget } from './TodayWidget';
import { todayWidgetModel, widgetName } from './model';
import { cycleFromWidget } from './actions';
import { refreshWidgets } from './bridge';
import { widgetViews } from './storage';
import { isWidgetNavigation } from './viewState';

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
  if (props.widgetInfo.widgetName !== widgetName) return;
  if (props.widgetAction === 'WIDGET_DELETED') {
    await widgetViews.remove(props.widgetInfo.widgetId);
    return;
  }
  let notice: string | undefined;
  try {
    if (
      props.widgetAction === 'WIDGET_CLICK' &&
      isWidgetNavigation(props.clickAction)
    )
      await widgetViews.navigate(
        props.widgetInfo.widgetId,
        props.clickAction,
        props.clickActionData,
      );
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
          notice =
            'Open the routine, then tap its status to confirm the checklist.';
        else if (result === 'error' || result === 'unavailable')
          notice = 'Open RoutineLog to review this routine.';
        else if (result === 'busy')
          notice = 'Saving changes. Tap refresh in a moment.';
      }
    }
    const state = routineStore.getState();
    const now = new Date();
    const view = await widgetViews.get(props.widgetInfo.widgetId, now);
    if (!state.ready) notice = 'Open RoutineLog to load your saved routines.';
    props.renderWidget(
      <TodayWidget
        model={todayWidgetModel(
          state.routines,
          state.logs,
          now,
          view.date,
          state.notes,
        )}
        height={props.widgetInfo.height}
        notice={notice}
      />,
    );
    // Navigation changes only this instance. renderWidget above already updates it;
    // replacing all collection adapters a second time causes a visible flash.
    if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'cycle')
      await refreshWidgets(notice, props.widgetInfo.widgetId);
  } catch {
    props.renderWidget(
      <TodayWidget
        model={todayWidgetModel([], [])}
        height={props.widgetInfo.height}
        notice="Could not refresh. Open RoutineLog to try again."
      />,
    );
  }
}
