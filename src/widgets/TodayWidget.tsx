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
      ? 'Statuses view only · tap the heading for today'
      : undefined);
  const compact = height < 150;
  const headerHeight = 44;
  const noticeHeight = explanation ? (compact ? 18 : 24) : 0;
  // Fit the visible panel to its content; the launcher still owns the allocated
  // grid area. Additional routines scroll once the available height is filled.
  const panelHeight = Math.min(
    height,
    headerHeight +
      1 +
      noticeHeight +
      (model.items.length ? model.items.length * 48 : 36) +
      64,
  );
  // Android collections require each row to fit inside the visible list, even
  // when the launcher resizes this widget to its existing 110dp minimum.
  const rowHeight = Math.max(
    1,
    Math.min(48, panelHeight - headerHeight - 1 - noticeHeight),
  );
  const circleSize = Math.min(24, Math.max(18, rowHeight - 14));
  const noteHeight = Math.max(
    1,
    Math.min(64, panelHeight - headerHeight - 1 - noticeHeight),
  );
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
      }}
      accessibilityLabel={
        model.isToday ? 'RoutineLog today' : `RoutineLog ${model.label}`
      }
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          height: panelHeight,
          backgroundColor: palette.background,
          borderRadius: 22,
          overflow: 'hidden',
        }}
      >
        <FlexWidget
          style={{
            width: 'match_parent',
            height: headerHeight,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
          }}
        >
          <FlexWidget
            style={{
              flex: 1,
              width: 0,
              height: 'match_parent',
              justifyContent: 'center',
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
              style={{ fontSize: 16, color: palette.text }}
            />
          </FlexWidget>
          <FlexWidget
            style={{
              width: 44,
              height: headerHeight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            clickAction="previous_day"
            clickActionData={model.navigation}
            accessibilityLabel="Previous day"
          >
            <SvgWidget svg={chevron(false)} style={{ width: 18, height: 22 }} />
          </FlexWidget>
          <FlexWidget
            style={{
              width: 44,
              height: headerHeight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            clickAction="next_day"
            clickActionData={model.navigation}
            accessibilityLabel="Next day"
          >
            <SvgWidget svg={chevron(true)} style={{ width: 18, height: 22 }} />
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
              fontSize: 10,
              color: palette.muted,
              paddingHorizontal: 12,
              height: noticeHeight,
            }}
          />
        )}
        <FlexWidget style={{ width: 'match_parent', flex: 1 }}>
          <ListWidget>
            {model.items.length ? (
              model.items.map((item) => (
                <FlexWidget
                  key={item.id}
                  style={{ width: 'match_parent', height: rowHeight }}
                >
                  <FlexWidget
                    style={{
                      width: 'match_parent',
                      height: rowHeight - 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <FlexWidget
                      style={{
                        flex: 1,
                        width: 0,
                        height: 'match_parent',
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingLeft: 12,
                        paddingRight: 6,
                      }}
                      clickAction="OPEN_URI"
                      clickActionData={{ uri: item.openUrl }}
                      accessibilityLabel={`Open routine: ${item.name}`}
                    >
                      <FlexWidget
                        style={{
                          width: 3,
                          height: Math.min(26, Math.max(16, rowHeight - 16)),
                          borderRadius: 1.5,
                          backgroundColor: item.color,
                          marginRight: 10,
                        }}
                      />
                      <FlexWidget style={{ flex: 1, width: 0 }}>
                        <TextWidget
                          text={item.name}
                          maxLines={rowHeight < 44 ? 1 : 2}
                          truncate="END"
                          style={{
                            fontSize: compact ? 13 : 14,
                            color: palette.text,
                            width: 'match_parent',
                          }}
                        />
                      </FlexWidget>
                    </FlexWidget>
                    <FlexWidget
                      style={{
                        width: 44,
                        height: 'match_parent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
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
                      <TextWidget
                        text={symbols[item.status]}
                        style={{
                          width: circleSize,
                          height: circleSize,
                          borderRadius: circleSize / 2,
                          textAlign: 'center',
                          fontSize: 17,
                          color: '#ffffff',
                          backgroundColor: palette[item.status],
                        }}
                      />
                    </FlexWidget>
                  </FlexWidget>
                  <FlexWidget
                    style={{
                      width: 'match_parent',
                      height: 1,
                      backgroundColor: palette.divider,
                    }}
                  />
                </FlexWidget>
              ))
            ) : (
              <FlexWidget
                style={{
                  width: 'match_parent',
                  height: Math.min(36, rowHeight),
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                }}
              >
                <TextWidget
                  text={
                    model.isToday
                      ? 'No routines scheduled today'
                      : 'No routines for this day'
                  }
                  maxLines={1}
                  style={{ fontSize: 11, color: palette.muted }}
                />
              </FlexWidget>
            )}
            <FlexWidget
              style={{
                width: 'match_parent',
                height: noteHeight,
                paddingHorizontal: 12,
                paddingVertical: 6,
                justifyContent: 'center',
              }}
              clickAction="OPEN_URI"
              clickActionData={{ uri: model.note.openUrl }}
              accessibilityLabel={
                model.note.preview
                  ? `Open daily note: ${model.note.preview}`
                  : 'Add daily note'
              }
            >
              <TextWidget
                text="Daily note"
                maxLines={1}
                style={{ fontSize: 11, color: palette.muted, marginBottom: 3 }}
              />
              <TextWidget
                text={model.note.preview || 'Tap to add a daily note'}
                maxLines={noteHeight < 54 ? 1 : 2}
                truncate="END"
                style={{ fontSize: 12, color: palette.text }}
              />
            </FlexWidget>
          </ListWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
