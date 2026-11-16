import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { addDays, dateLabel } from '../../domain/dates';
import { maxTaskLength, type DailyTask } from '../../domain/task';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import {
  useRevealInput,
  useRevealSection,
} from '../../components/KeyboardAwareScrollView';
import { useTaskPostpone } from './useTaskPostpone';
import { create } from 'zustand';

// Inline editors can unmount on a date/section change. Keep unsubmitted text
// in UI state until Save or an explicit discard; it is never synchronized.
const useTaskEditorDrafts = create<{
  values: Record<string, string>;
  edit(key: string, value: string): void;
  clear(key: string): void;
}>((set) => ({
  values: {},
  edit: (key, value) =>
    set((state) => ({ values: { ...state.values, [key]: value } })),
  clear: (key) =>
    set((state) => {
      const values = { ...state.values };
      delete values[key];
      return { values };
    }),
}));

function DescriptionInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText(value: string): void;
}) {
  const input = useRef<TextInput>(null);
  const section = useRef<View>(null);
  const reveal = useRevealInput();
  const revealSection = useRevealSection();
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let attempts = 0;
      const activate = () => {
        if (cancelled) return;
        revealSection(section.current, () => {
          if (cancelled) return;
          input.current?.focus();
          timer = setTimeout(() => {
            if (!cancelled && !input.current?.isFocused() && ++attempts < 6)
              activate();
          }, 150);
        });
      };
      const frame = requestAnimationFrame(activate);
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }, [revealSection]),
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // Native autofocus can precede the JS onFocus handler inside a Modal.
      if (input.current?.isFocused()) reveal(input.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [reveal]);
  return (
    <View ref={section}>
      <TextInput
        ref={input}
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
        onBlur={() => reveal(null, input.current)}
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
    </View>
  );
}

export function TaskEditor({
  date,
  task,
  onClose,
  inline = false,
}: {
  date: string;
  task?: DailyTask;
  onClose(): void;
  inline?: boolean;
}) {
  const draftKey = task?.id ?? `new-${date}`;
  const description =
    useTaskEditorDrafts((state) => state.values[draftKey]) ??
    task?.description ??
    '';
  const setDescription = (value: string) =>
    useTaskEditorDrafts.getState().edit(draftKey, value);
  const finish = () => {
    useTaskEditorDrafts.getState().clear(draftKey);
    onClose();
  };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRoutines((state) => state.saving);
  const saveTask = useRoutines((state) => state.saveTask);
  const deleteTask = useRoutines((state) => state.deleteTask);
  const postpone = useTaskPostpone((state) => state.postpone);
  const close = () =>
    description !== (task?.description ?? '') ? setDiscard(true) : finish();
  const content = (
    <>
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
      <View style={common.wrap}>
        <Button
          compact
          label={task ? 'Save task' : 'Add task'}
          tone="primary"
          disabled={saving || !description.trim()}
          onPress={() =>
            void (async () => {
              if (await saveTask(date, description, task?.id)) finish();
              else
                setError(
                  'Could not save this task. Your text is still here. Try again.',
                );
            })()
          }
        />
        {inline && <Button compact label="Close" onPress={close} />}
      </View>
      <View style={common.wrap}>
        {task && !task.done && (
          <Button
            compact
            label={`Postpone → ${dateLabel(addDays(task.date, 1), { weekday: 'short', day: 'numeric' })}`}
            icon="calendar"
            disabled={saving}
            onPress={() =>
              void (async () => {
                if (
                  description !== task.description &&
                  !(await saveTask(date, description, task.id))
                )
                  return;
                if (await postpone(task.id, task.date)) finish();
              })()
            }
          />
        )}
        {task && (
          <Button
            compact
            label="Delete task"
            tone="danger"
            disabled={saving}
            onPress={() => setConfirmDelete(true)}
          />
        )}
      </View>
      {confirmDelete && (
        <View style={{ gap: 8 }}>
          <Text style={common.text}>
            Delete this task? It will be archived in Notion.
          </Text>
          <Button
            label="Confirm delete task"
            tone="danger"
            disabled={saving}
            onPress={() =>
              void (async () => {
                if (await deleteTask(task!.id)) finish();
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
          <Button label="Discard changes" onPress={finish} />
          <Button label="Keep editing" onPress={() => setDiscard(false)} />
        </View>
      )}
    </>
  );
  return inline ? (
    <View style={{ gap: 9, paddingBottom: 12 }}>{content}</View>
  ) : (
    <Sheet visible title={task ? 'Edit task' : 'Add task'} onClose={close}>
      {content}
    </Sheet>
  );
}
