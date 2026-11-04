import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { addDays, dateLabel } from '../../domain/dates';
import { getStats } from '../../domain/insights';
import { historyForRange } from '../../domain/history';
import { occurrencesForDate, scheduleLabel } from '../../domain/schedule';
import type { Routine, RoutineLog } from '../../domain/models';
import { HabitIcon, categoryColors } from '../../components/HabitIcon';
import { Icon } from '../../components/Icon';
import { ToolButton } from '../../components/HabitScreen';
import { useRoutineActions } from '../../components/RoutineActionsProvider';
import { useRoutines } from '../../store/useRoutines';
import { nextActionLabel, statusLabels } from '../../domain/status';
import { entryBlockReason } from '../../domain/entry';
import { colors, common } from '../../theme';

export function RoutineCard({
  routine,
  logs,
  today,
  onCalendar,
  onInsights,
  onEdit,
}: {
  routine: Routine;
  logs: RoutineLog[];
  today: string;
  onCalendar(date: string): void;
  onInsights(): void;
  onEdit(): void;
}) {
  const { cycleStatus } = useRoutineActions();
  const saving = useRoutines((state) => state.saving);
  const tint = categoryColors[routine.category];
  const metrics = useMemo(() => {
    const now = new Date(`${today}T12:00:00`);
    const entries = historyForRange(
      [routine],
      logs,
      addDays(today, -29),
      today,
      now,
    );
    let streak = 0;
    for (const entry of entries) {
      if (entry.status !== 'done') break;
      streak++;
    }
    return { entries, streak, stats: getStats([routine], logs, now, 30) };
  }, [routine, logs, today]);
  return (
    <View
      testID={`routine-${routine.id}`}
      style={[styles.card, !routine.active && { opacity: 0.6 }]}
    >
      <View style={styles.top}>
        <View style={common.grow}>
          <Text style={styles.name}>{routine.name}</Text>
          <View style={styles.badgeRow}>
            <Text
              style={[
                styles.badge,
                { color: tint, backgroundColor: `${tint}26` },
              ]}
            >
              {scheduleLabel(routine.schedule)}
            </Text>
          </View>
          {!routine.active && <Text style={common.small}>Paused</Text>}
        </View>
        <HabitIcon routine={routine} small />
      </View>
      <View style={styles.week}>
        {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map(
          (date) => {
            const log = logs.find(
              (item) =>
                item.routineId === routine.id && item.scheduledFor === date,
            );
            const canMark = !entryBlockReason(
              routine,
              date,
              'calendar',
              Boolean(log),
              today,
            );
            const occurrence = occurrencesForDate(
              [routine],
              logs,
              date,
              new Date(`${today}T12:00:00`),
            )[0];
            const missed = metrics.entries.some(
              (item) => item.scheduledFor === date && item.status === 'missed',
            );
            const due =
              (occurrence?.status === 'pending' && date < today) || missed;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`Status: ${routine.name}, ${dateLabel(date)}. ${statusLabels[log?.status ?? 'pending']}. ${nextActionLabel(log?.status)}`}
                accessibilityState={{ disabled: !canMark || saving }}
                disabled={!canMark || saving}
                onPress={() => cycleStatus(routine.id, date, 'calendar')}
                style={[styles.weekDay, !canMark && { opacity: 0.4 }]}
              >
                <Text style={styles.weekLabel}>
                  {dateLabel(date, { weekday: 'short' }).replace('.', '')}
                </Text>
                <View
                  style={[
                    styles.date,
                    due && styles.due,
                    log?.status === 'done' && {
                      backgroundColor: `${tint}44`,
                      borderColor: tint,
                    },
                    date === today && styles.current,
                    log?.status === 'missed' && { borderColor: colors.danger },
                    log?.status === 'skipped' && {
                      borderColor: colors.warning,
                      backgroundColor: `${colors.warning}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      date === today && { fontWeight: '700' },
                    ]}
                  >
                    {Number(date.slice(-2))}
                  </Text>
                  {log && (
                    <View
                      style={{
                        position: 'absolute',
                        right: -3,
                        bottom: -4,
                        backgroundColor: colors.panel,
                        borderRadius: 8,
                      }}
                    >
                      <Icon
                        name={
                          log.status === 'done'
                            ? 'check'
                            : log.status === 'missed'
                              ? 'close'
                              : 'skip'
                        }
                        size={13}
                        color={
                          log.status === 'done'
                            ? colors.success
                            : log.status === 'missed'
                              ? colors.danger
                              : colors.warning
                        }
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          },
        )}
      </View>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Progress: ${routine.name}, 30-day streak ${metrics.streak}, consistency ${metrics.stats.regularity}%`}
          onPress={onInsights}
          style={styles.metrics}
        >
          <Icon name="chain" color={tint} size={16} />
          <Text style={styles.metric}>{metrics.streak}</Text>
          <Icon name="checkCircle" color={tint} size={16} />
          <Text style={styles.metric}>{metrics.stats.regularity}%</Text>
        </Pressable>
        <View style={common.row}>
          <ToolButton
            icon="calendar"
            label={`Open calendar: ${routine.name}`}
            onPress={() => onCalendar(today)}
          />
          <ToolButton
            icon="insights"
            label={`Insights: ${routine.name}`}
            onPress={onInsights}
          />
          <ToolButton
            icon="edit"
            label={`Edit routine: ${routine.name}`}
            onPress={onEdit}
          />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: 26, overflow: 'hidden' },
  top: {
    paddingHorizontal: 14,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.text },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  badge: {
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 3,
    borderRadius: 3,
    flexShrink: 1,
  },
  week: {
    flexDirection: 'row',
    gap: 1,
    paddingHorizontal: 12,
    marginTop: 15,
    marginBottom: 12,
  },
  weekDay: { flex: 1, minHeight: 60, alignItems: 'center', gap: 6 },
  weekLabel: { fontSize: 10, color: colors.muted, textTransform: 'capitalize' },
  date: {
    width: 38,
    height: 39,
    borderRadius: 15,
    backgroundColor: '#262626',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  due: { borderColor: colors.warning },
  current: { borderColor: '#b8b8b8' },
  dayNumber: { fontSize: 14, color: colors.text },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#252525',
    minHeight: 45,
    paddingLeft: 14,
    paddingRight: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metrics: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    minHeight: 44,
  },
  metric: { fontSize: 12, fontWeight: '700', color: colors.text },
});
