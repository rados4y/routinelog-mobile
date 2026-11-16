import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTask } from '../domain/task';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { widgetTaskHandler } from './handler';
import { widgetName } from './model';
const mock = vi.hoisted(() => ({
  getState: vi.fn(),
  subscribe: vi.fn(),
  navigate: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  cycle: vi.fn(),
  toggleTask: vi.fn(),
  postponeTask: vi.fn(),
  expand: vi.fn(),
  setUndo: vi.fn(),
}));
vi.mock('../store/useRoutines', () => ({
  routineStore: { getState: mock.getState, subscribe: mock.subscribe },
}));
vi.mock('./TodayWidget', () => ({ TodayWidget: () => null }));
vi.mock('./storage', () => ({
  widgetViews: {
    navigate: mock.navigate,
    get: mock.get,
    remove: mock.remove,
    expand: mock.expand,
    setUndo: mock.setUndo,
  },
}));
vi.mock('./bridge', () => ({ refreshWidgets: mock.refresh }));
vi.mock('./actions', () => ({
  cycleFromWidget: mock.cycle,
  toggleTaskFromWidget: mock.toggleTask,
  postponeTaskFromWidget: mock.postponeTask,
}));
const props = (): WidgetTaskHandlerProps => ({
  widgetInfo: {
    widgetId: 7,
    widgetName,
    width: 300,
    height: 260,
    screenInfo: {
      screenHeightDp: 800,
      screenWidthDp: 400,
      density: 2,
      densityDpi: 320,
      fontScale: 1,
    },
  },
  widgetAction: 'WIDGET_CLICK',
  clickAction: 'next_day',
  clickActionData: { date: '2026-11-08', viewedOn: '2026-11-08' },
  renderWidget: vi.fn(),
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-08T12:00:00'));
  mock.getState.mockReturnValue({
    ready: true,
    saving: false,
    loading: false,
    routines: [],
    logs: [],
    notes: [],
    tasks: [],
  });
  mock.get.mockResolvedValue({ date: '2026-11-08', viewedOn: '2026-11-08' });
  mock.cycle.mockResolvedValue('done');
});
afterEach(() => vi.useRealTimers());
describe('widget update targeting', () => {
  it('expands only the clicked instance with one render and no broadcast refresh', async () => {
    const event = {
      ...props(),
      clickAction: 'expand',
      clickActionData: {
        date: '2026-11-08',
        viewedOn: '2026-11-08',
        kind: 'task',
        id: 'one',
      },
    };
    await widgetTaskHandler(event);
    expect(mock.expand).toHaveBeenCalledWith(7, event.clickActionData);
    expect(event.renderWidget).toHaveBeenCalledTimes(1);
    expect(mock.refresh).not.toHaveBeenCalled();
  });
  it('persists a successful task move for Undo and refreshes other instances once', async () => {
    const task = createTask('one', '2026-11-09', 'Move me');
    mock.getState.mockReturnValue({
      ready: true,
      saving: false,
      routines: [],
      logs: [],
      notes: [],
      tasks: [task],
    });
    mock.postponeTask.mockResolvedValue('saved');
    const event = {
      ...props(),
      clickAction: 'task_postpone',
      clickActionData: {
        date: '2026-11-08',
        taskId: 'one',
        expectedDone: false,
      },
    };
    await widgetTaskHandler(event);
    expect(mock.setUndo).toHaveBeenCalledWith(7, task, '2026-11-08');
    expect(event.renderWidget).toHaveBeenCalledTimes(1);
    expect(mock.refresh).toHaveBeenCalledWith(undefined, 7);
  });
  it('ignores a today status tap from an instance that is now showing another date', async () => {
    mock.get.mockResolvedValue({ date: '2026-11-07', viewedOn: '2026-11-08' });
    await widgetTaskHandler({ ...props(), clickAction: 'cycle' });
    expect(mock.cycle).not.toHaveBeenCalled();
  });
  it('toggles tasks separately and refreshes the other widget instances once', async () => {
    mock.toggleTask.mockResolvedValue('saved');
    const event = { ...props(), clickAction: 'task_toggle' };
    await widgetTaskHandler(event);
    expect(mock.toggleTask).toHaveBeenCalledTimes(1);
    expect(mock.cycle).not.toHaveBeenCalled();
    expect(event.renderWidget).toHaveBeenCalledTimes(1);
    expect(mock.refresh).toHaveBeenCalledWith(undefined, 7);
  });
  it('changes a date with one render and leaves other instances untouched', async () => {
    const event = props();
    await widgetTaskHandler(event);
    expect(mock.navigate).toHaveBeenCalledWith(
      7,
      'next_day',
      event.clickActionData,
    );
    expect(event.renderWidget).toHaveBeenCalledTimes(1);
    expect(mock.refresh).not.toHaveBeenCalled();
  });
  it('cycles locally, renders once and refreshes only the other instances', async () => {
    const event = { ...props(), clickAction: 'cycle' };
    await widgetTaskHandler(event);
    expect(mock.cycle).toHaveBeenCalledTimes(1);
    expect(event.renderWidget).toHaveBeenCalledTimes(1);
    expect(mock.refresh).toHaveBeenCalledWith(undefined, 7);
  });
  it('does not redraw all instances after lifecycle updates or deletion', async () => {
    const event = { ...props(), widgetAction: 'WIDGET_UPDATE' as const };
    await widgetTaskHandler(event);
    expect(event.renderWidget).toHaveBeenCalledTimes(1);
    expect(mock.refresh).not.toHaveBeenCalled();
    await widgetTaskHandler({ ...event, widgetAction: 'WIDGET_DELETED' });
    expect(mock.remove).toHaveBeenCalledWith(7);
    expect(event.renderWidget).toHaveBeenCalledTimes(1);
  });
});
