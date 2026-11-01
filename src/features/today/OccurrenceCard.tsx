import { useState } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { StatusBadge, getStatusInfo } from '../../components/StatusBadge';
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
  const { routine, status, overdue, weeklyProgress, date } = occurrence;
  const [expanded, setExpanded] = useState(false);
  const setStatus = useRoutines((s) => s.setStatus);
  const saving = useRoutines((s) => s.saving);
  const info = getStatusInfo(status, overdue);
  const schedule = scheduleLabel(routine.schedule);
  const description = weeklyProgress
    ? `${weeklyProgress.done}/${weeklyProgress.target} w tygodniu`
    : schedule;
  const checked = status === 'done';

  return (
    <View
      testID={`occurrence-${routine.id}`}
      style={[styles.card, checked && styles.done]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Szczegóły rutyny: ${routine.name}`}
          accessibilityHint={`${routine.reminderTime}, ${routine.category}, ${schedule}, ${info.text}. Rozwiń notatkę i opcje rutyny.`}
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [
            styles.body,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <View style={styles.emoji}>
            <Text style={styles.emojiText}>{routine.icon}</Text>
          </View>
          <View style={common.grow}>
            <Text
              numberOfLines={2}
              style={[styles.name, checked && styles.doneName]}
            >
              {routine.name}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              {routine.reminderTime} · {routine.category}
            </Text>
            <View style={styles.scheduleRow}>
              <Text
                numberOfLines={1}
                style={[styles.schedule, weeklyProgress && styles.weekly]}
              >
                {description}
                {(status !== 'pending' || overdue) && (
                  <Text style={{ color: info.color }}> · {info.text}</Text>
                )}
              </Text>
              <View
                style={{
                  transform: [{ rotate: expanded ? '180deg' : '0deg' }],
                }}
              >
                <Icon name="chevronDown" size={12} />
              </View>
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
          accessibilityHint={
            checked
              ? 'Przywróć rutynę do zrobienia.'
              : 'Zaznacz wykonanie dla wybranej daty.'
          }
          accessibilityState={{ checked, disabled: future || saving }}
          aria-checked={checked}
          disabled={future || saving}
          onPress={() =>
            void setStatus(routine.id, date, checked ? 'pending' : 'done')
          }
          style={({ pressed }) => [
            styles.complete,
            { opacity: future || saving ? 0.35 : pressed ? 0.65 : 1 },
          ]}
        >
          <View
            style={[
              styles.checkbox,
              checked && styles.checked,
              status === 'skipped' && styles.skipped,
              status === 'missed' && styles.missed,
            ]}
          >
            {checked && <Icon name="check" size={20} color={colors.success} />}
            {status === 'skipped' && (
              <Icon name="skip" size={15} color={colors.warning} />
            )}
            {status === 'missed' && (
              <Icon name="close" size={17} color={colors.danger} />
            )}
          </View>
        </Pressable>
      </View>
      {expanded && (
        <View style={styles.details}>
          <View style={[common.spread, { flexWrap: 'wrap' }]}>
            <Text style={common.small}>{schedule}</Text>
            <StatusBadge status={status} overdue={overdue} />
          </View>
          {!!routine.note && <Text style={styles.note}>{routine.note}</Text>}
          <View style={common.wrap}>
            {status !== 'done' && status !== 'skipped' && (
              <Button
                label="Pomiń"
                icon="skip"
                tone="warning"
                disabled={future || saving}
                onPress={() => void setStatus(routine.id, date, 'skipped')}
                compact
              />
            )}
            {(status === 'done' || status === 'skipped') && (
              <Button
                label="Cofnij status"
                icon="undo"
                disabled={saving}
                onPress={() => void setStatus(routine.id, date, 'pending')}
                compact
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
  },
  emoji: {
    width: 32,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelSecondary,
  },
  emojiText: { fontSize: 20 },
  name: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  schedule: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 1,
  },
  weekly: { color: colors.accentLight },
  done: { borderColor: '#254633' },
  doneName: { textDecorationLine: 'line-through', color: colors.muted },
  complete: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { borderColor: colors.success, backgroundColor: '#35c46a18' },
  skipped: { borderColor: colors.warning, backgroundColor: '#f2a93b12' },
  missed: { borderColor: colors.danger, backgroundColor: '#ef5b5b12' },
  details: {
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
