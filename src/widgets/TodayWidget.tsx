'use no memo';

import {
  FlexWidget,
  ListWidget,
  SvgWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { TodayWidgetModel } from './model';
import { statusLabels, nextActionLabel } from '../domain/status';
import { TaskWidgetRow } from './TaskWidgetRow';
import { WidgetSection } from './WidgetSection';
import { WidgetDetails } from './WidgetDetails';
import type { WidgetView } from './viewState';

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
  view,
}: {
  model: TodayWidgetModel;
  notice?: string;
  height?: number;
  view?: WidgetView;
}) {
  const explanation = notice;
  const compact = height < 150;
  const headerHeight = 44;
  // Reserve the same notice slot across dates to keep the collection in place.
  const noticeHeight = explanation ? (compact ? 18 : 24) : 0;
  // Fill the launcher allocation on every day; only the collection scrolls.
  const panelHeight = height;
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
              text={
                model.isToday
                  ? `Today · ${model.label.split(' ').slice(1).join(' ')}`
                  : model.label
              }
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
        <TextWidget
          text={explanation ?? ''}
          maxLines={compact ? 1 : 2}
          style={{
            fontSize: 10,
            color: palette.muted,
            paddingHorizontal: 12,
            height: noticeHeight,
          }}
        />
        <FlexWidget style={{ width: 'match_parent', flex: 1 }}>
          <ListWidget>
            <WidgetSection
              title="Routines"
              count={`${model.done}/${model.items.length}`}
              addUrl={model.canAddTask ? model.addRoutineUrl : undefined}
              height={Math.min(36, rowHeight)}
            />
            {model.items.length ? (
              model.items.flatMap((item) => [
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
                      clickAction="expand"
                      clickActionData={{
                        ...model.navigation,
                        kind: 'routine',
                        id: item.id,
                      }}
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
                            fontSize: 13,
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
                          borderRadius: 6,
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
                </FlexWidget>,
                ...(view?.expanded?.kind === 'routine' &&
                view.expanded.id === item.id
                  ? [
                      <WidgetDetails
                        key={`details-${item.id}`}
                        editUrl={item.openUrl}
                        height={rowHeight}
                      />,
                    ]
                  : []),
              ])
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
            <WidgetSection
              title="Tasks"
              count={`${model.tasks.filter((task) => task.done).length}/${model.tasks.length}`}
              addUrl={model.canAddTask ? model.addTaskUrl : undefined}
              height={Math.min(36, rowHeight)}
            />
            {model.tasks.flatMap((task) => [
              <TaskWidgetRow
                key={task.id}
                task={task}
                height={rowHeight}
                isToday={model.isToday}
                navigation={model.navigation}
              />,
              ...(view?.expanded?.kind === 'task' &&
              view.expanded.id === task.id
                ? [
                    <WidgetDetails
                      key={`details-${task.id}`}
                      editUrl={task.openUrl}
                      height={rowHeight}
                      postpone={
                        model.isToday && !task.done ? task.click : undefined
                      }
                    />,
                  ]
                : []),
            ])}
            {!model.tasks.length && (
              <TextWidget
                text="No tasks for this day"
                style={{
                  height: Math.min(28, rowHeight),
                  fontSize: 11,
                  color: palette.muted,
                  paddingHorizontal: 12,
                }}
              />
            )}
            <WidgetSection
              title="Daily note"
              count={model.note.preview ? '1 note' : 'No note'}
              addUrl={model.note.openUrl}
              height={Math.min(36, rowHeight)}
            />
            <FlexWidget
              style={{
                width: 'match_parent',
                height: noteHeight,
                paddingHorizontal: 12,
                paddingVertical: 6,
                justifyContent: 'center',
              }}
              clickAction="expand"
              clickActionData={{
                ...model.navigation,
                kind: 'note',
                id: 'note',
              }}
              accessibilityLabel={
                model.note.preview
                  ? `Open daily note: ${model.note.preview}`
                  : 'Add daily note'
              }
            >
              <TextWidget
                text={model.note.preview || 'Tap to add a daily note'}
                maxLines={noteHeight < 54 ? 1 : 2}
                truncate="END"
                style={{ fontSize: 12, color: palette.text }}
              />
            </FlexWidget>
            {view?.expanded?.kind === 'note' && (
              <WidgetDetails editUrl={model.note.openUrl} height={rowHeight} />
            )}
            {view?.undo && (
              <FlexWidget
                style={{
                  width: 'match_parent',
                  height: rowHeight,
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                  backgroundColor: '#e8e8e8',
                }}
                clickAction="task_undo_postpone"
                clickActionData={{
                  ...model.navigation,
                  taskId: view.undo.task.id,
                  updatedAt: view.undo.task.updatedAt,
                }}
                accessibilityLabel="Undo postpone"
              >
                <TextWidget
                  text={`Moved to ${view.undo.task.date} · Undo`}
                  style={{ fontSize: 12, color: '#a82549' }}
                />
              </FlexWidget>
            )}
          </ListWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
