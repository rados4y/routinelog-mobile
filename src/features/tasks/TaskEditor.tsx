import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { dateLabel } from '../../domain/dates';
import { maxTaskLength, type DailyTask } from '../../domain/task';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import { useRevealInput } from '../../components/KeyboardAwareScrollView';

function DescriptionInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText(value: string): void;
}) {
  const input = useRef<TextInput>(null);
  const reveal = useRevealInput();
  return (
    <TextInput
      ref={input}
      autoFocus
      multiline
      accessibilityLabel="Task description"
      placeholder="What do you need to do?"
      placeholderTextColor={colors.muted}
      value={value}
      onChangeText={onChangeText}
      maxLength={maxTaskLength}
      textAlignVertical="top"
      onFocus={() => reveal(input.current)}
      onSelectionChange={() => reveal(input.current)}
      onContentSizeChange={() => reveal(input.current)}
      onBlur={() => reveal(null)}
      style={{
        color: colors.text,
        backgroundColor: colors.panelSecondary,
        borderRadius: 14,
        padding: 14,
        minHeight: 100,
        maxHeight: 180,
        fontSize: 16,
      }}
    />
  );
}

export function TaskEditor({
  date,
  task,
  onClose,
}: {
  date: string;
  task?: DailyTask;
  onClose(): void;
}) {
  const [description, setDescription] = useState(task?.description ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRoutines((state) => state.saving);
  const saveTask = useRoutines((state) => state.saveTask);
  const deleteTask = useRoutines((state) => state.deleteTask);
  const close = () =>
    description !== (task?.description ?? '') ? setDiscard(true) : onClose();
  return (
    <Sheet visible title={task ? 'Edit task' : 'Add task'} onClose={close}>
      <Text style={common.small}>
        {dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>
      <DescriptionInput
        value={description}
        onChangeText={(value) => {
          setDescription(value);
          setError(null);
        }}
      />
      {error && (
        <Text accessibilityRole="alert" style={common.small}>
          {error}
        </Text>
      )}
      <Button
        label={task ? 'Save task' : 'Add task'}
        tone="primary"
        disabled={saving || !description.trim()}
        onPress={() =>
          void (async () => {
            if (await saveTask(date, description, task?.id)) onClose();
            else
              setError(
                'Could not save this task. Your text is still here. Try again.',
              );
          })()
        }
      />
      {task && (
        <Button
          label="Delete task"
          tone="danger"
          disabled={saving}
          onPress={() => setConfirmDelete(true)}
        />
      )}
      {confirmDelete && (
        <View style={{ gap: 8 }}>
          <Text style={common.text}>
            Delete this task from the app and Notion?
          </Text>
          <Button
            label="Confirm delete task"
            tone="danger"
            disabled={saving}
            onPress={() =>
              void (async () => {
                if (await deleteTask(task!.id)) onClose();
                else setError('Could not delete the task. Try again.');
              })()
            }
          />
          <Button label="Keep task" onPress={() => setConfirmDelete(false)} />
        </View>
      )}
      {discard && (
        <View style={{ gap: 8 }}>
          <Text style={common.text}>Discard unsaved task changes?</Text>
          <Button label="Discard changes" onPress={onClose} />
          <Button label="Keep editing" onPress={() => setDiscard(false)} />
        </View>
      )}
    </Sheet>
  );
}
