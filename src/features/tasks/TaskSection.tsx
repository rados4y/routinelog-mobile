import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { tasksForDate, type DailyTask } from '../../domain/task';
import { useRoutines } from '../../store/useRoutines';
import { common, colors } from '../../theme';
import { TaskEditor } from './TaskEditor';
import { DailySection, dailyStyles } from '../today/DailySection';
import { Icon } from '../../components/Icon';
import { useTaskPostpone } from './useTaskPostpone';
import { Button } from '../../components/Button';
import { dateLabel } from '../../domain/dates';

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
  const undo = useTaskPostpone((state) => state.undo);
  const restore = useTaskPostpone((state) => state.restore);
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
    <DailySection
      title="Tasks"
      count={`${selected.filter((task) => task.done).length}/${selected.length}`}
      addLabel="Add task"
      onAdd={() => setEditor({})}
      disabled={date < today}
    >
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
            flexDirection: 'column',
            alignItems: 'stretch',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            minHeight: 56,
          }}
        >
          <View style={dailyStyles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit task: ${task.description}`}
              accessibilityState={{ expanded: editor?.task?.id === task.id }}
              onPress={() =>
                setEditor(editor?.task?.id === task.id ? null : { task })
              }
              style={dailyStyles.body}
            >
              <Icon name="notes" size={20} />
              <Text
                style={[
                  dailyStyles.name,
                  { flex: 1, fontSize: 14 },
                  task.done && {
                    color: colors.muted,
                    textDecorationLine: 'line-through',
                  },
                ]}
              >
                {task.description}
              </Text>
              <Icon name="chevronDown" size={14} />
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
                    : date < today
                      ? colors.danger
                      : colors.panelSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {task.done ? '✓' : date < today ? '×' : ''}
                </Text>
              </View>
            </Pressable>
          </View>
          {editor?.task?.id === task.id && (
            <TaskEditor
              inline
              key={task.id}
              date={date}
              task={editor.task}
              onClose={() => setEditor(null)}
            />
          )}
        </View>
      ))}
      {editor && !editor.task && (
        <TaskEditor
          inline
          date={date}
          task={editor.task}
          onClose={() => setEditor(null)}
        />
      )}
      {undo && (
        <View style={{ gap: 6, paddingVertical: 8 }}>
          <Text accessibilityRole="alert" style={common.small}>
            Moved to{' '}
            {dateLabel(undo.task.date, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
          <Button
            compact
            label="Undo postpone"
            icon="undo"
            onPress={() => void restore()}
            disabled={saving}
          />
        </View>
      )}
    </DailySection>
  );
}
