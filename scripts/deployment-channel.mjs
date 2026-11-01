const channels = ['development', 'preview', 'production'];

/** Choose a release destination independently of credentials and persistence. */
export function getDeploymentChannel(eventName, refName, requestedChannel) {
  if (eventName === 'workflow_dispatch') {
    const channel = requestedChannel || 'preview';
    if (!channels.includes(channel)) {
      throw new Error(`Invalid EAS channel: ${channel}`);
    }
    return channel;
  }
  if (eventName === 'pull_request') return 'preview';
  return refName === 'main' ? 'production' : 'development';
}
