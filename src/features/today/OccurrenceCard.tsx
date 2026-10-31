import { Text, View, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
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
  const setStatus = useRoutines((s) => s.setStatus);
  const saving = useRoutines((s) => s.saving);
  return (
    <View
      testID={`occurrence-${routine.id}`}
      style={[common.card, status === 'done' && styles.done]}
    >
      <View style={common.row}>
        <View style={styles.emoji}>
          <Text style={styles.emojiText}>{routine.icon}</Text>
        </View>
        <View style={common.grow}>
          <Text
            style={[
              common.text,
              styles.name,
              status === 'done' && styles.doneName,
            ]}
          >
            {routine.name}
          </Text>
          <Text style={common.small}>
            {routine.reminderTime} · {routine.category}
          </Text>
        </View>
        <StatusBadge status={status} overdue={overdue} />
      </View>
      <Text style={common.small}>{scheduleLabel(routine.schedule)}</Text>
      {weeklyProgress && (
        <View style={styles.weekly}>
          <Text style={styles.weeklyText}>
            {weeklyProgress.done}/{weeklyProgress.target} wykonane w tym
            tygodniu
          </Text>
          <Text style={common.small}>Wybierz dni, które Ci pasują.</Text>
        </View>
      )}
      {!!routine.note && <Text style={styles.note}>↳ {routine.note}</Text>}
      <View style={common.wrap}>
        {status !== 'done' && (
          <Button
            label="Wykonane"
            icon="check"
            tone="success"
            disabled={future || saving}
            onPress={() => void setStatus(routine.id, date, 'done')}
            compact
          />
        )}
        {status !== 'skipped' && status !== 'done' && (
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
  );
}
const styles = StyleSheet.create({
  emoji: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelSecondary,
  },
  emojiText: { fontSize: 23 },
  name: { fontWeight: '700', marginBottom: 4 },
  done: { borderColor: '#254633' },
  doneName: { textDecorationLine: 'line-through', color: colors.muted },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  weekly: { gap: 3 },
  weeklyText: { color: colors.accentLight, fontSize: 12, fontWeight: '600' },
});
