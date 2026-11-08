import { useEffect, useRef, useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useRoutineActions } from '../../components/RoutineActionsProvider';
import { nextActionLabel, statusLabels } from '../../domain/status';
import { ToolButton } from '../../components/HabitScreen';
import { categoryLabels } from '../../i18n/en';
import { Icon } from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { HabitIcon, categoryColors } from '../../components/HabitIcon';
import { scheduleLabel } from '../../domain/schedule';
import type { Occurrence } from '../../domain/models';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import { useRevealSection } from '../../components/KeyboardAwareScrollView';

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
  const [expansion, setExpansion] = useState<{
    request?: number;
    value: boolean;
  }>({ value: false });
  const expanded =
    expansion.request === focusRequest
      ? expansion.value
      : Boolean(focusRequest);
  const card = useRef<View>(null);
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
  const tint = categoryColors[routine.category];
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
          style={styles.body}
        >
          <HabitIcon routine={routine} small />
          <View style={common.grow}>
            <Text
              numberOfLines={2}
              style={[styles.name, checked && styles.done]}
            >
              {routine.name}
            </Text>
            <View style={styles.badgeRow}>
              <Text
                style={[
                  styles.badge,
                  { color: tint, backgroundColor: `${tint}24` },
                ]}
              >
                {status === 'skipped'
                  ? 'Skipped'
                  : explicitStatus === 'missed'
                    ? 'Not done'
                    : checked
                      ? 'Done'
                      : 'Routine'}
              </Text>
            </View>
          </View>
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
              checked && { backgroundColor: tint },
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
          <View style={{ alignItems: 'flex-end' }}>
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
  card: { borderBottomWidth: 1, borderColor: '#1c1c1c', paddingVertical: 13 },
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
    width: 31,
    height: 31,
    borderRadius: 18,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { paddingTop: 14, paddingBottom: 4, gap: 10 },
});
