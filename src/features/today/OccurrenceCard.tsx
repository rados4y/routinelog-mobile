import { useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { StatusBadge } from '../../components/StatusBadge';
import { HabitIcon, categoryColors } from '../../components/HabitIcon';
import { scheduleLabel } from '../../domain/schedule';
import type { Occurrence } from '../../domain/models';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';

export function OccurrenceCard({
  occurrence,
  future,
}: {
  occurrence: Occurrence;
  future: boolean;
}) {
  const { routine, status, overdue, date, windowProgress } = occurrence;
  const [expanded, setExpanded] = useState(false);
  const setStatus = useRoutines((state) => state.setStatus);
  const saving = useRoutines((state) => state.saving);
  const checked = status === 'done';
  const tint = categoryColors[routine.category];
  return (
    <View testID={`occurrence-${routine.id}`} style={styles.card}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Szczegóły rutyny: ${routine.name}`}
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() => setExpanded(!expanded)}
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
                  ? 'Pominięte'
                  : checked
                    ? 'Wykonane'
                    : 'Rutyna'}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={
            checked
              ? `Cofnij wykonanie: ${routine.name}`
              : `Wykonane: ${routine.name}`
          }
          accessibilityState={{ checked, disabled: future || saving }}
          aria-checked={checked}
          disabled={future || saving}
          onPress={() =>
            void setStatus(routine.id, date, checked ? 'pending' : 'done')
          }
          style={styles.touch}
        >
          <View
            style={[
              styles.circle,
              checked && { backgroundColor: tint },
              status === 'skipped' && {
                borderColor: colors.warning,
                borderWidth: 1,
              },
              future && { opacity: 0.4 },
            ]}
          >
            {checked && <Icon name="check" color={colors.text} size={22} />}
            {status === 'skipped' && (
              <Icon name="skip" color={colors.warning} size={17} />
            )}
            {status === 'missed' && (
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
            {routine.reminderTime} · {routine.category}
            {windowProgress
              ? ` · ${windowProgress.done}/${windowProgress.target} w okresie`
              : ''}
          </Text>
          {!!routine.note && (
            <Text style={common.subtitle}>{routine.note}</Text>
          )}
          <View style={common.wrap}>
            {status !== 'done' && status !== 'skipped' && (
              <Button
                label="Pomiń"
                compact
                tone="warning"
                disabled={future || saving}
                onPress={() => void setStatus(routine.id, date, 'skipped')}
              />
            )}
            {(status === 'done' || status === 'skipped') && (
              <Button
                label="Cofnij status"
                compact
                disabled={saving}
                onPress={() => void setStatus(routine.id, date, 'pending')}
              />
            )}
            <Button
              label="Edytuj rutynę"
              compact
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
