import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoutineState } from '../store/createRoutineStore';
import { createTask } from '../domain/task';
import { WidgetAutoRefresh } from './WidgetAutoRefresh';

const mock = vi.hoisted(() => ({
  effect: vi.fn(),
  subscribe: vi.fn(),
  addListener: vi.fn(),
  refresh: vi.fn(),
  app: { currentState: 'active' },
}));
vi.mock('react', () => ({ useEffect: mock.effect }));
vi.mock('react-native', () => ({
  AppState: {
    get currentState() {
      return mock.app.currentState;
    },
    addEventListener: mock.addListener,
  },
}));
vi.mock('../store/useRoutines', () => ({
  routineStore: { subscribe: mock.subscribe },
}));
vi.mock('./bridge', () => ({
  isWidgetAvailable: () => true,
  refreshWidgets: mock.refresh,
}));

type State = Pick<
  RoutineState,
  'ready' | 'saving' | 'routines' | 'logs' | 'notes' | 'tasks'
>;
let changed: (state: State, previous: State) => void;
let appChanged: (state: string) => void;
let cleanup: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mock.app.currentState = 'active';
  mock.refresh.mockResolvedValue(undefined);
  mock.subscribe.mockImplementation((listener) => {
    changed = listener;
    return () => {};
  });
  mock.addListener.mockImplementation((_name, listener) => {
    appChanged = listener;
    return { remove() {} };
  });
  mock.effect.mockImplementation((effect) => {
    cleanup = effect();
  });
  WidgetAutoRefresh();
  vi.advanceTimersByTime(200);
  mock.refresh.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const base = (): State => ({
  ready: true,
  saving: false,
  tasks: [],
  routines: [],
  logs: [],
  notes: [],
});
function background() {
  mock.app.currentState = 'background';
  appChanged('background');
}
function writeStart(state: State) {
  const next = { ...state, saving: true };
  changed(next, state);
  return next;
}
function writeEnd(state: State) {
  const next = {
    ...state,
    tasks: [createTask('task', '2026-11-15', 'Collect parcel')],
  };
  changed(next, state);
  changed({ ...next, saving: false }, next);
}
describe('widget refresh after app saves', () => {
  it('flushes a pending refresh before Android pauses background timers, without a second render', () => {
    writeEnd(writeStart(base()));
    expect(mock.refresh).not.toHaveBeenCalled();
    background();
    expect(mock.refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(mock.refresh).toHaveBeenCalledTimes(1);
  });
  it('refreshes when an app write finishes after Home was pressed', () => {
    const saving = writeStart(base());
    background();
    writeEnd(saving);
    expect(mock.refresh).toHaveBeenCalledTimes(1);
  });
  it('leaves background headless status updates to their handler, avoiding duplicate refreshes', () => {
    background();
    writeEnd(writeStart(base()));
    vi.advanceTimersByTime(500);
    expect(mock.refresh).not.toHaveBeenCalled();
  });
});
