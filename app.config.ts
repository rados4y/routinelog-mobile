import type { ConfigContext, ExpoConfig } from 'expo/config';
import easProject from './eas-project.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID || easProject.projectId;
  return {
    ...config,
    name: 'RoutineLog',
    slug: 'routinelog-mobile',
    ...(projectId
      ? {
          extra: { ...config.extra, eas: { projectId } },
          updates: { url: `https://u.expo.dev/${projectId}` },
          runtimeVersion: { policy: 'fingerprint' },
        }
      : { updates: { enabled: false } }),
  };
};
