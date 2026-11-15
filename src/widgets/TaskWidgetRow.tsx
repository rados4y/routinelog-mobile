'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { TodayWidgetModel } from './model';

export function TaskWidgetRow({
  task,
  height,
  isToday,
}: {
  task: TodayWidgetModel['tasks'][number];
  height: number;
  isToday: boolean;
}) {
  const size = Math.min(24, Math.max(18, height - 14));
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e4e4e4',
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: task.openUrl }}
        accessibilityLabel={`Open task: ${task.description}`}
        style={{
          flex: 1,
          width: 0,
          height: 'match_parent',
          paddingHorizontal: 12,
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={task.description}
          maxLines={height < 44 ? 1 : 2}
          truncate="END"
          style={{ fontSize: 13, color: task.done ? '#777777' : '#171717' }}
        />
      </FlexWidget>
      <FlexWidget
        clickAction={isToday ? 'task_toggle' : undefined}
        clickActionData={task.click}
        accessibilityLabel={`Task: ${task.description}. ${task.done ? 'Done' : 'Pending'}. ${isToday ? (task.done ? 'Undo task' : 'Complete task') : 'View only'}`}
        style={{
          width: 44,
          height: 'match_parent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={task.done ? '✓' : ''}
          style={{
            width: size,
            height: size,
            borderRadius: 6,
            textAlign: 'center',
            fontSize: 16,
            color: '#ffffff',
            backgroundColor: task.done ? '#35b67d' : '#dddddd',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
