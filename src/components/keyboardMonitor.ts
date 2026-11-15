type KeyboardSignal =
  'keyboardDidShow' | 'keyboardDidHide' | 'keyboardDidChangeFrame';
interface KeyboardSource {
  metrics(): { screenY: number } | undefined;
  addListener(
    name: KeyboardSignal,
    listener: (event: { endCoordinates: { screenY: number } }) => void,
  ): { remove(): void };
}

// Autofocus in a native Modal can show IME between the first render and effect
// subscription. Sample its current metrics after subscribing to close that gap.
export function observeKeyboardTop(
  source: KeyboardSource,
  changed: (top: number | undefined) => void,
  nextFrame = (work: () => void) => requestAnimationFrame(work),
  cancelFrame = (frame: number) => cancelAnimationFrame(frame),
) {
  let received = false;
  let disposed = false;
  const publish = (top: number | undefined) => {
    received = true;
    changed(top);
  };
  const subscriptions = [
    source.addListener('keyboardDidShow', (event) =>
      publish(event.endCoordinates.screenY),
    ),
    source.addListener('keyboardDidChangeFrame', (event) =>
      publish(event.endCoordinates.screenY),
    ),
    source.addListener('keyboardDidHide', () => publish(undefined)),
  ];
  const frame = nextFrame(() => {
    if (!disposed && !received) changed(source.metrics()?.screenY);
  });
  return () => {
    disposed = true;
    cancelFrame(frame);
    subscriptions.forEach((subscription) => subscription.remove());
  };
}
