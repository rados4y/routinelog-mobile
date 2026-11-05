'use no memo';

import {
  FlexWidget,
  ListWidget,
  SvgWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { TodayWidgetModel } from './model';
import { statusLabels, nextActionLabel } from '../domain/status';

// The launcher widget deliberately uses the light reference design, independent
// of the app's dark theme. Native widget primitives render without React hooks.
const palette = {
  background: '#f1f1f1',
  text: '#171717',
  muted: '#666666',
  divider: '#e4e4e4',
  pending: '#dddddd',
  done: '#35b67d',
  missed: '#e05a5a',
  skipped: '#e6a438',
} as const;
const symbols = { pending: '', done: '✓', missed: '×', skipped: '−' };
const chevron = (next: boolean) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28"><path d="${next ? 'M8 5l9 9-9 9' : 'M16 5l-9 9 9 9'}" fill="none" stroke="#202020" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function TodayWidget({
  model,
  notice,
  height = 260,
}: {
  model: TodayWidgetModel;
  notice?: string;
  height?: number;
}) {
  const explanation =
    notice ??
    (!model.isToday
      ? 'View only · tap the heading to return to today'
      : undefined);
  const compact = height < 150;
  const headerHeight = compact ? 44 : 56;
  const noticeHeight = explanation ? (compact ? 20 : 34) : 0;
  // Android collections require each row to fit inside the visible list, even
  // when the launcher resizes this widget to its existing 110dp minimum.
  const rowHeight = Math.max(
    1,
    Math.min(76, height - headerHeight - 1 - noticeHeight),
  );
  const circleSize = Math.min(36, Math.max(18, rowHeight - 14));
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: palette.background,
        borderRadius: 30,
        overflow: 'hidden',
      }}
      accessibilityLabel={
        model.isToday ? 'RoutineLog today' : `RoutineLog ${model.label}`
      }
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          height: headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        <FlexWidget
          style={{
            flex: 1,
            width: 0,
            height: 'match_parent',
            justifyContent: 'center',
            paddingLeft: 5,
          }}
          clickAction="today"
          clickActionData={model.navigation}
          accessibilityLabel={
            model.isToday
              ? "Today. Refresh today's routines"
              : 'Return to today'
          }
        >
          <TextWidget
            text={model.title}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 20, color: palette.text }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            width: 52,
            height: headerHeight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          clickAction="previous_day"
          clickActionData={model.navigation}
          accessibilityLabel="Previous day"
        >
          <SvgWidget svg={chevron(false)} style={{ width: 24, height: 28 }} />
        </FlexWidget>
        <FlexWidget
          style={{
            width: 52,
            height: headerHeight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          clickAction="next_day"
          clickActionData={model.navigation}
          accessibilityLabel="Next day"
        >
          <SvgWidget svg={chevron(true)} style={{ width: 24, height: 28 }} />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 1,
          backgroundColor: palette.divider,
        }}
      />
      {!!explanation && (
        <TextWidget
          text={explanation}
          maxLines={compact ? 1 : 2}
          style={{
            fontSize: 11,
            color: palette.muted,
            paddingHorizontal: 20,
            height: noticeHeight,
          }}
        />
      )}
      {!model.items.length ? (
        <FlexWidget style={{ width: 'match_parent', flex: 1, padding: 20 }}>
          <TextWidget
            text={
              model.isToday
                ? 'No routines scheduled today'
                : 'No routines for this day'
            }
            style={{ fontSize: 15, color: palette.muted }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ width: 'match_parent', flex: 1 }}>
          <ListWidget>
            {model.items.map((item) => (
              <FlexWidget
                key={item.id}
                style={{ width: 'match_parent', height: rowHeight }}
                clickAction={
                  model.isToday
                    ? item.requiresChecklist
                      ? 'OPEN_URI'
                      : 'cycle'
                    : undefined
                }
                clickActionData={
                  item.requiresChecklist
                    ? { uri: item.checklistUrl }
                    : item.click
                }
                accessibilityLabel={`${item.name}. ${statusLabels[item.status]}. ${!model.isToday ? 'View only' : item.requiresChecklist ? 'Open checklist' : nextActionLabel(item.status)}`}
              >
                <FlexWidget
                  style={{
                    width: 'match_parent',
                    height: rowHeight - 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 18,
                  }}
                >
                  <FlexWidget
                    style={{
                      width: 4,
                      height: Math.min(42, Math.max(18, rowHeight - 18)),
                      borderRadius: 2,
                      backgroundColor: item.color,
                      marginRight: 14,
                    }}
                  />
                  <FlexWidget
                    style={{
                      flex: 1,
                      width: 0,
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <TextWidget
                      text={item.name}
                      maxLines={rowHeight < 65 ? 1 : 2}
                      truncate="END"
                      style={{
                        fontSize: compact ? 16 : 18,
                        color: palette.text,
                      }}
                    />
                  </FlexWidget>
                  <TextWidget
                    text={symbols[item.status]}
                    style={{
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                      textAlign: 'center',
                      fontSize: 25,
                      color: '#ffffff',
                      backgroundColor: palette[item.status],
                    }}
                  />
                </FlexWidget>
                <FlexWidget
                  style={{
                    width: 'match_parent',
                    height: 1,
                    backgroundColor: palette.divider,
                  }}
                />
              </FlexWidget>
            ))}
          </ListWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
