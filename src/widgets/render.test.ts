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
}));

describe('native widget rendering', () => {
  it('serializes today, empty and error views with the native widget renderer', () => {
    const now = new Date(2026, 10, 4, 12);
    const model = todayWidgetModel([routine()], [], now);
    for (const props of [
      { model },
      { model: todayWidgetModel([], [], now) },
      { model, notice: 'Could not refresh' },
    ]) {
      const tree = buildWidgetTree(createElement(TodayWidget, props));
      expect(JSON.stringify(tree)).toContain('RoutineLog');
    }
  });
});
