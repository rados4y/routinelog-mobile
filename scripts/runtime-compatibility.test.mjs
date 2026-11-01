import { describe, expect, it } from 'vitest';
import { findCompatibleBuild } from './runtime-compatibility.mjs';

// The EAS CLI BuildFragment returns runtime.version, rather than runtimeVersion.
const finishedAndroid = {
  id: 'android-build',
  platform: 'ANDROID',
  status: 'FINISHED',
  runtime: { id: 'runtime-id', version: 'native-runtime-a' },
  fingerprint: { hash: 'build-fingerprint' },
};

describe('EAS runtime compatibility', () => {
  it('recognizes the runtime object returned by EAS CLI', () => {
    expect(findCompatibleBuild([finishedAndroid], 'native-runtime-a')).toBe(
      finishedAndroid,
    );
  });

  it.each([
    { ...finishedAndroid, platform: 'IOS' },
    { ...finishedAndroid, status: 'IN_PROGRESS' },
    { ...finishedAndroid, runtime: null },
    { ...finishedAndroid, runtime: { version: 'native-runtime-b' } },
  ])('rejects an incompatible build: %j', (build) => {
    expect(findCompatibleBuild([build], 'native-runtime-a')).toBeUndefined();
  });

  it('does not substitute a matching build fingerprint for a different embedded runtime', () => {
    const build = {
      ...finishedAndroid,
      fingerprint: { hash: 'native-runtime-b' },
    };
    expect(findCompatibleBuild([build], 'native-runtime-b')).toBeUndefined();
  });

  it('finds an older compatible build and rejects an empty runtime', () => {
    const newer = {
      ...finishedAndroid,
      runtime: { version: 'native-runtime-b' },
    };
    expect(
      findCompatibleBuild([newer, finishedAndroid], 'native-runtime-a'),
    ).toBe(finishedAndroid);
    expect(findCompatibleBuild([finishedAndroid], '')).toBeUndefined();
  });
});
