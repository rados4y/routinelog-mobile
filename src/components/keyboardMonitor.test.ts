import { describe, expect, it, vi } from 'vitest';
import { observeKeyboardTop } from './keyboardMonitor';

function setup() {
  let frame: () => void = () => {};
  const listeners = new Map<
    string,
    (event: { endCoordinates: { screenY: number } }) => void
  >();
  const remove = vi.fn();
  const metrics = vi.fn<() => { screenY: number } | undefined>(() => undefined);
  const changed = vi.fn();
  const cancel = vi.fn();
  const dispose = observeKeyboardTop(
    {
      metrics,
      addListener: (name, handler) => {
        listeners.set(name, handler);
        return { remove };
      },
    },
    changed,
    (work) => {
      frame = work;
      return 1;
    },
    cancel,
  );
  return {
    frame: () => frame(),
    listeners,
    metrics,
    changed,
    cancel,
    remove,
    dispose,
  };
}
describe('keyboard measurement across native Modal autofocus', () => {
  it('recovers an IME show event that happened before subscription', () => {
    const fixture = setup();
    fixture.metrics.mockReturnValue({ screenY: 1048 });
    fixture.frame();
    expect(fixture.changed).toHaveBeenCalledWith(1048);
  });
  it('keeps a newer keyboard event authoritative over the initial sample', () => {
    const fixture = setup();
    fixture.metrics.mockReturnValue({ screenY: 1048 });
    fixture.listeners.get('keyboardDidHide')!({
      endCoordinates: { screenY: 1920 },
    });
    fixture.frame();
    expect(fixture.changed.mock.calls).toEqual([[undefined]]);
    fixture.listeners.get('keyboardDidChangeFrame')!({
      endCoordinates: { screenY: 900 },
    });
    expect(fixture.changed).toHaveBeenLastCalledWith(900);
  });
  it('cancels measurement and subscriptions when the modal closes', () => {
    const fixture = setup();
    fixture.dispose();
    fixture.frame();
    expect(fixture.cancel).toHaveBeenCalledWith(1);
    expect(fixture.remove).toHaveBeenCalledTimes(3);
    expect(fixture.changed).not.toHaveBeenCalled();
  });
});
