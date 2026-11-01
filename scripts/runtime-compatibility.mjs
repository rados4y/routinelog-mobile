/** Match the runtime embedded in a completed Android build, as returned by EAS CLI. */
export function findCompatibleBuild(builds, runtimeVersion) {
  if (!runtimeVersion) return undefined;
  return builds.find(
    (build) =>
      build.platform === 'ANDROID' &&
      build.status === 'FINISHED' &&
      build.runtime?.version === runtimeVersion,
  );
}
