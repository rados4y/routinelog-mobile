/* eslint-disable @typescript-eslint/no-require-imports -- Native imports must be guarded so core screens run in Expo Go. */
import { isWidgetAvailable } from './bridge';
if (isWidgetAvailable()) {
  // Register synchronously before Expo Router. Expo Go skips native-only imports.
  const { registerWidgetTaskHandler } =
    require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } =
    require('./handler') as typeof import('./handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
