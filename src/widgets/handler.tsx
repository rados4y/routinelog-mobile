import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { routineStore } from '../store/useRoutines';
import { TodayWidget } from './TodayWidget';
import { todayWidgetModel, widgetName, taskClickSchema } from './model';
import {
  cycleFromWidget,
  toggleTaskFromWidget,
  postponeTaskFromWidget,
} from './actions';
import { localDate } from '../domain/dates';
import { z } from 'zod';
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
    if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'expand')
      await widgetViews.expand(
        props.widgetInfo.widgetId,
        props.clickActionData,
      );
    if (!(await waitForIdle()))
      notice = 'Saving changes. Tap refresh in a moment.';
    else {
      if (!routineStore.getState().ready) await routineStore.getState().load();
      const previousView = await widgetViews.get(props.widgetInfo.widgetId);
      if (
        props.widgetAction === 'WIDGET_CLICK' &&
        props.clickAction === 'task_postpone' &&
        previousView.date === localDate()
      ) {
        const result = await postponeTaskFromWidget(
          routineStore.getState(),
          props.clickActionData,
        );
        const parsed = taskClickSchema.safeParse(props.clickActionData);
        if (result === 'saved' && parsed.success) {
          const task = routineStore
            .getState()
            .tasks.find((item) => item.id === parsed.data.taskId);
          await widgetViews.setUndo(
            props.widgetInfo.widgetId,
            task,
            parsed.data.date,
          );
        } else if (result === 'error')
          notice = 'Could not postpone. Open RoutineLog to try again.';
      }
      if (
        props.widgetAction === 'WIDGET_CLICK' &&
        props.clickAction === 'task_undo_postpone'
      ) {
        const parsed = z
          .object({
            date: z.iso.date(),
            viewedOn: z.iso.date(),
            taskId: z.string(),
            updatedAt: z.string(),
          })
          .safeParse(props.clickActionData);
        const undo = previousView.undo;
        if (
          parsed.success &&
          previousView.date === localDate() &&
          parsed.data.date === previousView.date &&
          parsed.data.viewedOn === localDate() &&
          undo?.task.id === parsed.data.taskId &&
          undo.task.updatedAt === parsed.data.updatedAt
        ) {
          if (
            await routineStore.getState().undoTaskPostpone(undo.task, undo.from)
          )
            await widgetViews.setUndo(props.widgetInfo.widgetId);
          else notice = 'Task changed. Open RoutineLog to review it.';
        }
      }
      if (
        props.widgetAction === 'WIDGET_CLICK' &&
        (props.clickAction === 'cycle' ||
          props.clickAction === 'task_toggle') &&
        previousView.date === localDate() &&
        z
          .object({ date: z.literal(previousView.date) })
          .safeParse(props.clickActionData).success
      ) {
        const result = await (
          props.clickAction === 'task_toggle'
            ? toggleTaskFromWidget
            : cycleFromWidget
        )(routineStore.getState(), props.clickActionData);
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
          state.tasks,
        )}
        height={props.widgetInfo.height}
        view={view}
        notice={notice}
      />,
    );
    // Navigation changes only this instance. renderWidget above already updates it;
    // replacing all collection adapters a second time causes a visible flash.
    if (
      props.widgetAction === 'WIDGET_CLICK' &&
      (props.clickAction === 'cycle' ||
        props.clickAction === 'task_toggle' ||
        props.clickAction === 'task_postpone' ||
        props.clickAction === 'task_undo_postpone')
    )
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
