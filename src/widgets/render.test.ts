import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildWidgetTree,
  type WidgetTree,
} from 'react-native-android-widget/src/api/build-widget-tree';
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

function widgetProps(tree: WidgetTree): Record<string, unknown>[] {
  return [tree.props, ...(tree.children ?? []).flatMap(widgetProps)].filter(
    (value): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null,
  );
}

describe('native widget rendering', () => {
  it('fills the same launcher height with zero, one and many routines on every date', () => {
    const now = new Date(2026, 10, 4, 12);
    for (const height of [110, 145, 260, 420]) {
      for (const count of [0, 1, 12]) {
        for (const date of ['2026-11-03', '2026-11-04', '2026-11-05']) {
          const routines = Array.from({ length: count }, (_, index) => ({
            ...routine(),
            id: `routine-${index}`,
          }));
          const model = todayWidgetModel(routines, [], now, date);
          const tree = buildWidgetTree(
            createElement(TodayWidget, { model, height }),
          );
          const props = widgetProps(tree);
          const panel = props.find((p) => p.backgroundColor === '#f1f1f1');
          expect(panel).toMatchObject({ height });
        }
      }
    }
  });

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
      expect(json).toContain('Open routine:');
      expect(json).toContain('Add daily note');
    }
  });
  it('gives routine names, status controls and notes separate actions in the actual native tree', () => {
    const now = new Date(2026, 10, 4, 12);
    const r = routine();
    const model = todayWidgetModel([r], [], now, '2026-11-04', [
      { date: '2026-11-04', content: 'Remember this day' },
    ]);
    const props = widgetProps(
      buildWidgetTree(createElement(TodayWidget, { model })),
    );
    expect(
      props.find((p) => p.accessibilityLabel === `Open routine: ${r.name}`),
    ).toMatchObject({
      clickAction: 'OPEN_URI',
      clickActionData: { uri: model.items[0]!.openUrl },
    });
    expect(props.find((p) => p.clickAction === 'cycle')).toMatchObject({
      clickActionData: model.items[0]!.click,
    });
    expect(
      props.find(
        (p) => p.accessibilityLabel === 'Open daily note: Remember this day',
      ),
    ).toMatchObject({
      clickAction: 'OPEN_URI',
      clickActionData: { uri: model.note.openUrl },
    });
    for (const height of [110, 145, 260]) {
      expect(() =>
        buildWidgetTree(
          createElement(TodayWidget, {
            model,
            height,
            notice: 'Saving changes',
          }),
        ),
      ).not.toThrow();
    }
  });
});
