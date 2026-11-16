import { useEffect, useRef, useState } from 'react';
import { Text, View, Pressable, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useRoutineActions } from '../../components/RoutineActionsProvider';
import { nextActionLabel, statusLabels } from '../../domain/status';
import { ToolButton } from '../../components/HabitScreen';
import { categoryLabels } from '../../i18n/en';
import { Icon } from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { HabitIcon } from '../../components/HabitIcon';
import { scheduleLabel } from '../../domain/schedule';
import type { Occurrence } from '../../domain/models';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import {
  useRevealSection,
  useRevealInput,
} from '../../components/KeyboardAwareScrollView';
import { dailyStyles } from './DailySection';
import { Button } from '../../components/Button';

export function OccurrenceCard({
  occurrence,
  future,
  focusRequest,
}: {
  occurrence: Occurrence;
  future: boolean;
  focusRequest?: number;
}) {
  const { routine, status, overdue, date, windowProgress } = occurrence;
  const [name, setName] = useState<string | null>(null);
  const saveRoutine = useRoutines((state) => state.saveRoutine);
  const toggleRoutine = useRoutines((state) => state.toggleRoutine);
  const [expansion, setExpansion] = useState<{
    request?: number;
    value: boolean;
  }>({ value: false });
  const expanded =
    expansion.request === focusRequest
      ? expansion.value
      : Boolean(focusRequest);
  const card = useRef<View>(null);
  const nameInput = useRef<TextInput>(null);
  const revealInput = useRevealInput();
  const reveal = useRevealSection();
  useEffect(() => {
    if (!focusRequest || !expanded) return;
    const frame = requestAnimationFrame(() => reveal(card.current));
    return () => cancelAnimationFrame(frame);
  }, [focusRequest, expanded, reveal]);
  const { cycleStatus } = useRoutineActions();
  const explicitStatus = occurrence.log?.status ?? 'pending';
  const saving = useRoutines((state) => state.saving);
  const checked = status === 'done';
  return (
    <View
      ref={card}
      testID={`occurrence-${routine.id}`}
      style={[styles.card, Boolean(focusRequest) && expanded && styles.focused]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Routine details: ${routine.name}`}
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() =>
            setExpansion({ request: focusRequest, value: !expanded })
          }
          style={dailyStyles.body}
        >
          <HabitIcon routine={routine} small />
          <View style={common.grow}>
            <Text
              numberOfLines={2}
              style={[styles.name, checked && styles.done]}
            >
              {routine.name}
            </Text>
            <Text style={common.small}>
              {routine.reminderTime} · {categoryLabels[routine.category]}
            </Text>
          </View>
          <Icon name="chevronDown" size={14} />
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Status: ${routine.name}. ${statusLabels[explicitStatus]}. ${nextActionLabel(explicitStatus)}`}
          accessibilityState={{ checked, disabled: future || saving }}
          aria-checked={checked}
          disabled={future || saving}
          onPress={() => cycleStatus(routine.id, date)}
          style={styles.touch}
        >
          <View
            style={[
              styles.circle,
              checked && { backgroundColor: colors.success },
              explicitStatus === 'skipped' && {
                borderColor: colors.warning,
                borderWidth: 1,
              },
              future && { opacity: 0.4 },
            ]}
          >
            {checked && <Icon name="check" color={colors.text} size={22} />}
            {explicitStatus === 'skipped' && (
              <Icon name="skip" color={colors.warning} size={17} />
            )}
            {explicitStatus === 'missed' && (
              <Icon name="close" color={colors.danger} size={17} />
            )}
          </View>
        </Pressable>
      </View>
      {expanded && (
        <View style={styles.details}>
          <TextInput
            ref={nameInput}
            accessibilityLabel={`Routine name: ${routine.name}`}
            value={name ?? routine.name}
            onChangeText={setName}
            onFocus={() => revealInput(nameInput.current)}
            onSelectionChange={() => revealInput(nameInput.current)}
            onBlur={() => revealInput(null)}
            style={{
              color: colors.text,
              backgroundColor: colors.panelSecondary,
              borderRadius: 10,
              padding: 10,
              fontSize: 16,
            }}
          />
          {name !== null && (
            <View style={common.wrap}>
              <Button
                compact
                label="Save routine name"
                disabled={saving || !name.trim()}
                onPress={() =>
                  void (async () => {
                    if (await saveRoutine({ ...routine, name }, routine.id))
                      setName(null);
                  })()
                }
              />
              <Button
                compact
                label="Cancel name edit"
                onPress={() => setName(null)}
              />
            </View>
          )}
          <View style={common.spread}>
            <Text style={[common.small, common.grow]}>
              {scheduleLabel(routine.schedule)}
            </Text>
            <StatusBadge status={status} overdue={overdue} />
          </View>
          <Text style={common.small}>
            {routine.reminderTime} · {categoryLabels[routine.category]}
            {windowProgress
              ? ` · ${windowProgress.done}/${windowProgress.target} this period`
              : ''}
          </Text>
          {!!routine.checklist?.length && (
            <Text style={common.small}>
              {routine.checklist.length} steps to confirm
            </Text>
          )}
          {!!routine.note && (
            <Text style={common.subtitle}>{routine.note}</Text>
          )}
          <View
            style={[
              common.wrap,
              { justifyContent: 'flex-end', alignItems: 'center' },
            ]}
          >
            <Button
              compact
              label="Pause routine"
              disabled={saving}
              onPress={() => void toggleRoutine(routine.id)}
            />
            <ToolButton
              icon="edit"
              label={`Edit routine: ${routine.name}`}
              onPress={() =>
                router.push({
                  pathname: '/routine-editor',
                  params: { id: routine.id },
                })
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
  },
  focused: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 44,
  },
  name: {
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '500',
  },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  badge: {
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 3,
    borderRadius: 3,
  },
  touch: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { paddingTop: 14, paddingBottom: 4, gap: 10 },
});
