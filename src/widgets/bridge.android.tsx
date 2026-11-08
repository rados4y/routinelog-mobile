/* eslint-disable @typescript-eslint/no-require-imports -- Native imports must be guarded so core screens run in Expo Go. */
import { TurboModuleRegistry } from 'react-native';
import { routineStore } from '../store/useRoutines';
import { todayWidgetModel, widgetName } from './model';
import { widgetViews } from './storage';

export const isWidgetAvailable = () =>
  Boolean(TurboModuleRegistry.get('AndroidWidget'));
function nativeWidget() {
  // The guard keeps core screens usable in Expo Go, which lacks this native module.
  return require('react-native-android-widget') as typeof import('react-native-android-widget');
}
export async function refreshWidgets(
  notice?: string,
  excludeWidgetId?: number,
): Promise<void> {
  if (!isWidgetAvailable() || !routineStore.getState().ready) return;
  const { TodayWidget } =
    require('./TodayWidget') as typeof import('./TodayWidget');
  const state = routineStore.getState();
  const native = nativeWidget();
  const instances = await native.getWidgetInfo(widgetName);
  await Promise.all(
    instances
      .filter((info) => info.widgetId !== excludeWidgetId)
      .map((info) =>
        native.requestWidgetUpdateById({
          widgetName,
          widgetId: info.widgetId,
          renderWidget: async ({ widgetId, height }) => {
            const now = new Date();
            const view = await widgetViews.get(widgetId, now);
            const model = todayWidgetModel(
              state.routines,
              state.logs,
              now,
              view.date,
              state.notes,
            );
            return (
              <TodayWidget
                model={model}
                height={height}
                notice={notice ?? state.error ?? undefined}
              />
            );
          },
        }),
      ),
  );
}
export async function pinTodayWidget(): Promise<boolean> {
  if (!isWidgetAvailable()) return false;
  return nativeWidget().requestPinWidget({ widgetName });
}
