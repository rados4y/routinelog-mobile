import { beforeEach, describe, expect, it, vi } from 'vitest';
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
}));
vi.mock('../store/useRoutines', () => ({
  routineStore: { getState: mock.getState, subscribe: mock.subscribe },
}));
vi.mock('./TodayWidget', () => ({ TodayWidget: () => null }));
vi.mock('./storage', () => ({
  widgetViews: { navigate: mock.navigate, get: mock.get, remove: mock.remove },
}));
vi.mock('./bridge', () => ({ refreshWidgets: mock.refresh }));
vi.mock('./actions', () => ({ cycleFromWidget: mock.cycle }));
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
  mock.getState.mockReturnValue({
    ready: true,
    saving: false,
    loading: false,
    routines: [],
    logs: [],
    notes: [],
  });
  mock.get.mockResolvedValue({ date: '2026-11-09', viewedOn: '2026-11-08' });
  mock.cycle.mockResolvedValue('done');
});
describe('widget update targeting', () => {
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
