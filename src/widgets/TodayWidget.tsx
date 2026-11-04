import {
  FlexWidget,
  ListWidget,
  TextWidget,
} from 'react-native-android-widget';
import type { TodayWidgetModel } from './model';
import { statusLabels, nextActionLabel } from '../domain/status';
import { colors } from '../theme/colors';

const statusColors = {
  pending: '#919aa3',
  done: '#35c46a',
  missed: '#ef5b5b',
  skipped: '#f2a93b',
} as const;
const symbols = { pending: '○', done: '✓', missed: '×', skipped: '↷' };
export function TodayWidget({
  model,
  notice,
}: {
  model: TodayWidgetModel;
  notice?: string;
}) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: colors.background,
        borderRadius: 22,
        padding: 12,
      }}
      accessibilityLabel="RoutineLog today"
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        <FlexWidget
          style={{ flex: 1 }}
          clickAction="OPEN_APP"
          accessibilityLabel="Open RoutineLog"
        >
          <TextWidget
            text="RoutineLog"
            style={{ fontSize: 17, fontWeight: '700', color: colors.text }}
          />
          <TextWidget
            text={`${model.label} · ${model.done}/${model.items.length} done`}
            style={{ fontSize: 11, color: colors.muted }}
          />
        </FlexWidget>
        <TextWidget
          text="↻"
          clickAction="refresh"
          accessibilityLabel="Refresh today's routines"
          style={{
            fontSize: 25,
            color: colors.accentLight,
            width: 44,
            height: 44,
            textAlign: 'center',
          }}
        />
      </FlexWidget>
      {!!notice && (
        <TextWidget
          text={notice}
          maxLines={2}
          style={{ fontSize: 11, color: colors.warning, marginBottom: 6 }}
        />
      )}
      {!model.items.length ? (
        <FlexWidget
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            width: 'match_parent',
          }}
          clickAction="OPEN_APP"
        >
          <TextWidget
            text="No routines scheduled today"
            style={{ fontSize: 13, color: colors.muted }}
          />
          <TextWidget
            text="Open RoutineLog"
            style={{ fontSize: 12, color: colors.accentLight, marginTop: 6 }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flex: 1, width: 'match_parent' }}>
          <ListWidget>
            {model.items.map((item) => (
              <FlexWidget
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: 'match_parent',
                  backgroundColor: colors.panel,
                  padding: 8,
                  marginBottom: 5,
                  borderRadius: 14,
                }}
                clickAction={item.requiresChecklist ? 'OPEN_URI' : 'cycle'}
                clickActionData={
                  item.requiresChecklist
                    ? { uri: item.checklistUrl }
                    : item.click
                }
                accessibilityLabel={`${item.name}. ${statusLabels[item.status]}. ${item.requiresChecklist ? 'Open checklist' : nextActionLabel(item.status)}`}
              >
                <TextWidget
                  text={item.icon}
                  style={{
                    fontSize: 22,
                    width: 40,
                    height: 42,
                    textAlign: 'center',
                    backgroundColor: item.color,
                    borderRadius: 12,
                    marginRight: 9,
                  }}
                />
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget
                    text={item.name}
                    maxLines={2}
                    truncate="END"
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.text,
                    }}
                  />
                  <TextWidget
                    text={`${item.time}${item.requiresChecklist ? ' · Checklist' : ''}`}
                    style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}
                  />
                </FlexWidget>
                <TextWidget
                  text={symbols[item.status]}
                  style={{
                    width: 40,
                    height: 44,
                    textAlign: 'center',
                    fontSize: 25,
                    color: statusColors[item.status],
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
