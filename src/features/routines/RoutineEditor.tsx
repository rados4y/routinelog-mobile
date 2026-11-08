import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { Screen, EmptyState } from '../../components/Screen';
import {
  categories,
  routineInputSchema,
  type RoutineInput,
  type ChecklistItem,
  type Schedule,
} from '../../domain/models';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import { Chip, ScheduleEditor } from './ScheduleEditor';

import { categoryLabels } from '../../i18n/en';
import { localDate } from '../../domain/dates';
import { routineStartDate } from '../../domain/routine';
import { ChecklistEditor } from './ChecklistEditor';

const emojis = [
  '🎓',
  '💬',
  '🥾',
  '💊',
  '💧',
  '🏃',
  '🧘',
  '📚',
  '🪴',
  '🧹',
  '☎️',
  '🧴',
  '🦷',
  '💪',
  '✅',
];
export function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useRoutines((s) => s.routines).find(
    (routine) => routine.id === id && !routine.deletedAt,
  );
  const save = useRoutines((s) => s.saveRoutine);
  const saving = useRoutines((s) => s.saving);
  const remove = useRoutines((s) => s.deleteRoutine);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '✅');
  const [category, setCategory] = useState<RoutineInput['category']>(
    existing?.category ?? 'Inne',
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [time, setTime] = useState(existing?.reminderTime ?? '08:00');
  const [note, setNote] = useState(existing?.note ?? '');
  const [schedule, setSchedule] = useState<Schedule>(
    existing?.schedule ?? { kind: 'daily' },
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    existing?.checklist ?? [],
  );
  const [startDate, setStartDate] = useState(
    existing ? routineStartDate(existing) : localDate(),
  );
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [error, setError] = useState('');
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/routines');
  };
  const submit = async () => {
    setError('');
    const parsed = routineInputSchema.safeParse({
      name,
      icon,
      category,
      active,
      schedule,
      target: existing?.target ?? null,
      unit: existing?.unit ?? null,
      reminderTime: time.trim(),
      note: note.trim(),
      checklist,
      startDate: startDate.trim(),
      endDate: endDate.trim() || null,
    });
    if (endDate && endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    if (!parsed.success) {
      setError(
        parsed.error.issues.some((issue) => issue.path[0] === 'checklist')
          ? 'Fill in or remove empty steps. Each step can contain up to 200 characters.'
          : 'Check the name, icon, time (HH:MM), schedule and date range (YYYY-MM-DD). Select at least one day; intervals must be whole numbers from 1 to 3650 and the first date must use YYYY-MM-DD.',
      );
      return;
    }
    if (await save(parsed.data, id)) close();
  };
  if (id && !existing)
    return (
      <Screen title="Routine unavailable">
        <EmptyState
          title="Routine not found"
          description="It may have been deleted."
        />
        <Button label="Back to routines" onPress={close} />
      </Screen>
    );
  return (
    <KeyboardAvoidingView
      style={common.grow}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        title={id ? 'Edit routine' : 'New routine'}
        subtitle="Build a habit that fits your life"
        action={<Button label="Close" icon="close" onPress={close} compact />}
      >
        <View style={common.card}>
          <View>
            <Text style={common.label}>Routine name</Text>
            <TextInput
              accessibilityLabel="Routine name"
              placeholder="e.g. 15 minutes for yourself"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              maxLength={100}
              style={common.field}
            />
          </View>
          <View>
            <Text style={common.label}>Icon</Text>
            <View style={common.wrap}>
              {emojis.map((emoji) => (
                <Chip
                  key={emoji}
                  label={emoji}
                  selected={icon === emoji}
                  onPress={() => setIcon(emoji)}
                />
              ))}
            </View>
            <TextInput
              accessibilityLabel="Custom emoji icon"
              value={icon}
              onChangeText={setIcon}
              maxLength={16}
              style={[common.field, { marginTop: 10 }]}
            />
          </View>
          <View>
            <Text style={common.label}>Category</Text>
            <View style={common.wrap}>
              {categories.map((value) => (
                <Chip
                  key={value}
                  label={categoryLabels[value]}
                  selected={category === value}
                  onPress={() => setCategory(value)}
                />
              ))}
            </View>
          </View>
        </View>
        <View style={common.card}>
          <ScheduleEditor schedule={schedule} onChange={setSchedule} />
          <View>
            <Text style={common.label}>Time (HH:MM)</Text>
            <TextInput
              accessibilityLabel="Time"
              placeholder="08:00"
              placeholderTextColor={colors.muted}
              value={time}
              onChangeText={setTime}
              maxLength={5}
              keyboardType={
                Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'
              }
              style={common.field}
            />
            <Text style={[common.small, { marginTop: 8 }]}>
              The time sorts your daily plan. Reminders are not enabled yet.
            </Text>
          </View>
        </View>
        <View style={common.card}>
          <View>
            <Text style={common.label}>Note (optional)</Text>
            <TextInput
              accessibilityLabel="Note"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={1000}
              placeholder="Anything to remember?"
              placeholderTextColor={colors.muted}
              style={[
                common.field,
                { minHeight: 90, textAlignVertical: 'top' },
              ]}
            />
          </View>
          <View style={common.spread}>
            <View style={common.grow}>
              <Text style={common.text}>Routine active</Text>
              <Text style={common.small}>Include in your daily plan</Text>
            </View>
            <Switch
              accessibilityLabel="Routine active"
              value={active}
              onValueChange={setActive}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
        </View>
        <View style={common.card}>
          <Text style={common.heading}>Date range</Text>
          <Text style={common.label}>Start date (YYYY-MM-DD)</Text>
          <TextInput
            accessibilityLabel="Start date"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            maxLength={10}
            style={common.field}
          />
          <Text style={common.label}>End date (optional, inclusive)</Text>
          <TextInput
            accessibilityLabel="End date"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="No end date"
            placeholderTextColor={colors.muted}
            maxLength={10}
            style={common.field}
          />
          <Text style={common.small}>
            Dates limit your plan. Existing results are kept.
          </Text>
        </View>
        <ChecklistEditor items={checklist} onChange={setChecklist} />
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, lineHeight: 22 }}
          >
            {error}
          </Text>
        )}
        <Button
          label={saving ? 'Saving…' : 'Save routine'}
          tone="primary"
          icon="check"
          disabled={saving}
          onPress={() => void submit()}
        />
        <Button label="Cancel" disabled={saving} onPress={close} />
        {existing && (
          <View style={common.card}>
            <Text style={common.heading}>Delete routine</Text>
            <Text style={common.small}>
              Remove this routine from your plan. Previous history is kept.
            </Text>
            {confirmDelete ? (
              <>
                <Button
                  label="Confirm delete"
                  tone="danger"
                  disabled={saving}
                  onPress={() =>
                    void remove(existing.id).then((ok) => {
                      if (ok) close();
                    })
                  }
                />
                <Button
                  label="Keep routine"
                  disabled={saving}
                  onPress={() => setConfirmDelete(false)}
                />
              </>
            ) : (
              <Button
                label="Delete routine"
                tone="danger"
                disabled={saving}
                onPress={() => setConfirmDelete(true)}
              />
            )}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
