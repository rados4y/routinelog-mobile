const channels = ['development', 'preview', 'production'];

/** Choose a release destination independently of credentials and persistence. */
export function getDeploymentChannel(eventName, refName, requestedChannel) {
  if (eventName === 'workflow_dispatch' && requestedChannel) {
    if (!channels.includes(requestedChannel)) {
      throw new Error(`Invalid EAS channel: ${requestedChannel}`);
    }
    return requestedChannel;
  }
  if (eventName === 'pull_request') return 'preview';
  return refName === 'main' ? 'production' : 'development';
}
