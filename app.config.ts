import type { ConfigContext, ExpoConfig } from 'expo/config';
import easProject from './eas-project.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID || easProject.projectId;
  return {
    ...config,
    name: 'RoutineLog',
    slug: 'routinelog-mobile',
    plugins: [
      ...(config.plugins ?? []),
      'expo-secure-store',
      [
        'react-native-android-widget',
        {
          widgets: [
            {
              name: 'RoutineLogToday',
              label: 'RoutineLog Today',
              description: 'Your daily routines with tappable status icons',
              minWidth: '180dp',
              minHeight: '110dp',
              targetCellWidth: 4,
              targetCellHeight: 3,
              resizeMode: 'horizontal|vertical',
              updatePeriodMillis: 1800000,
            },
          ],
        },
      ],
    ],
    ...(projectId
      ? {
          extra: { ...config.extra, eas: { projectId } },
          updates: { url: `https://u.expo.dev/${projectId}` },
          runtimeVersion: { policy: 'fingerprint' },
        }
      : { updates: { enabled: false } }),
  };
};
