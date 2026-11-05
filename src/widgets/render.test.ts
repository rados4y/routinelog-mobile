import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';
import { TodayWidget } from './TodayWidget';
import { todayWidgetModel } from './model';
import { routine } from '../test/fixtures';

// Use the real widget serializer and primitives, without loading the RN runtime.
vi.mock('react-native-android-widget', async () => ({
  ...(await import('react-native-android-widget/src/widgets/FlexWidget')),
  ...(await import('react-native-android-widget/src/widgets/ListWidget')),
  ...(await import('react-native-android-widget/src/widgets/TextWidget')),
  ...(await import('react-native-android-widget/src/widgets/SvgWidget')),
}));
vi.mock('react-native', () => ({ Image: { resolveAssetSource: vi.fn() } }));

describe('native widget rendering', () => {
  it('serializes today, empty and error views with the native widget renderer', () => {
    const now = new Date(2026, 10, 4, 12);
    const model = todayWidgetModel([routine()], [], now);
    for (const props of [
      { model },
      { model: todayWidgetModel([], [], now) },
      { model, notice: 'Could not refresh' },
      { model, height: 110, notice: 'Could not refresh' },
    ]) {
      const tree = buildWidgetTree(createElement(TodayWidget, props));
      expect(JSON.stringify(tree)).toContain('RoutineLog');
    }
  });
  it('keeps date navigation available while historical and future rows are read-only', () => {
    const now = new Date(2026, 10, 4, 12);
    for (const date of ['2026-11-03', '2026-11-05']) {
      const model = todayWidgetModel([routine()], [], now, date);
      const tree = buildWidgetTree(createElement(TodayWidget, { model }));
      const json = JSON.stringify(tree);
      expect(json).toContain('previous_day');
      expect(json).toContain('next_day');
      expect(json).toContain('Return to today');
      expect(json).not.toContain('"clickAction":"cycle"');
      expect(json).not.toContain('"clickAction":"OPEN_URI"');
    }
  });
});
