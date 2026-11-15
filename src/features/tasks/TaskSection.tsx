import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { tasksForDate, type DailyTask } from '../../domain/task';
import { useRoutines } from '../../store/useRoutines';
import { common, colors } from '../../theme';
import { TaskEditor } from './TaskEditor';

export function TaskSection({
  date,
  today,
  openRequest,
  taskId,
}: {
  date: string;
  today: string;
  openRequest?: number;
  taskId?: string;
}) {
  const tasks = useRoutines((state) => state.tasks);
  const saving = useRoutines((state) => state.saving);
  const setTaskDone = useRoutines((state) => state.setTaskDone);
  const requestedTask = taskId
    ? tasks.find(
        (item) => item.id === taskId && item.date === date && !item.deletedAt,
      )
    : undefined;
  const unavailable =
    openRequest !== undefined && Boolean(taskId) && !requestedTask;
  // Today keys this section by navigation request. Opening initializes once;
  // incoming sync data never resets the draft while the user is typing.
  const [editor, setEditor] = useState<{ task?: DailyTask } | null>(
    openRequest !== undefined && !unavailable ? { task: requestedTask } : null,
  );
  const selected = tasksForDate(tasks, date);
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          accessibilityRole="header"
          style={[common.heading, { fontSize: 17 }]}
        >
          Tasks
        </Text>
        <Text style={common.small}>
          {selected.filter((task) => task.done).length}/{selected.length}
        </Text>
      </View>
      {unavailable && (
        <Text accessibilityRole="alert" style={common.small}>
          That task is no longer available.
        </Text>
      )}
      {!selected.length && (
        <Text style={common.small}>
          {date < today
            ? 'No tasks for this day.'
            : 'No tasks yet. Tap + to add one.'}
        </Text>
      )}
      {selected.map((task) => (
        <View
          key={task.id}
          testID={`task-${task.id}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            minHeight: 56,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit task: ${task.description}`}
            onPress={() => setEditor({ task })}
            style={{ flex: 1, paddingVertical: 12, paddingRight: 10 }}
          >
            <Text
              style={[
                common.text,
                task.done && {
                  color: colors.muted,
                  textDecorationLine: 'line-through',
                },
              ]}
            >
              {task.description}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Task status: ${task.description}`}
            accessibilityState={{
              checked: task.done,
              disabled: saving || date > today,
            }}
            aria-checked={task.done}
            disabled={saving || date > today}
            onPress={() => void setTaskDone(task.id, !task.done)}
            style={{
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: date > today ? 0.4 : 1,
            }}
          >
            <View
              style={{
                width: 27,
                height: 27,
                borderRadius: 8,
                backgroundColor: task.done
                  ? colors.success
                  : colors.panelSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {task.done ? '✓' : ''}
              </Text>
            </View>
          </Pressable>
        </View>
      ))}
      {editor && (
        <TaskEditor
          date={date}
          task={editor.task}
          onClose={() => setEditor(null)}
        />
      )}
    </View>
  );
}
