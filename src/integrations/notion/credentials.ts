import * as SecureStore from 'expo-secure-store';

const key = 'routinelog.notion.personal-token';
// User-supplied PAT: never a bundled integration secret, AsyncStorage value or public env var.
export const credentials = {
  get: () => SecureStore.getItemAsync(key),
  set: (token: string) =>
    SecureStore.setItemAsync(key, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  remove: () => SecureStore.deleteItemAsync(key),
};
export const supportsNotionConnection = true;
