import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { ProgressRing } from '../../components/ProgressRing';
import { dateLabel } from '../../domain/dates';
import { getStats } from '../../domain/insights';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import { useNow } from '../../utils/useNow';

export function InsightsScreen() {
  const routines = useRoutines((s) => s.routines);
  const logs = useRoutines((s) => s.logs);
  const stats = getStats(routines, logs, useNow());
  const max = Math.max(1, ...stats.activity.map((day) => day.done));
  return (
    <Screen
      title="Statystyki"
      subtitle="Zobacz, jak małe kroki budują regularność"
    >
      <View style={common.spread}>
        <Text style={common.heading}>Twój ostatni tydzień</Text>
        <Text style={styles.period}>7 dni</Text>
      </View>
      <View style={styles.metrics}>
        {[
          { label: 'Wykonane', value: stats.done, color: colors.success },
          { label: 'Pominięte', value: stats.skipped, color: colors.warning },
          { label: 'Niewykonane', value: stats.missed, color: colors.danger },
        ].map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={[styles.number, { color: metric.color }]}>
              {metric.value}
            </Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <View style={common.card}>
        <Text style={common.heading}>Aktywność</Text>
        <Text style={common.small}>Wykonane rutyny każdego dnia</Text>
        <View style={styles.chart}>
          {stats.activity.map((day) => (
            <View
              key={day.date}
              style={styles.column}
              accessible
              accessibilityLabel={`${dateLabel(day.date)}: ${day.done} wykonanych`}
            >
              <Text style={styles.count}>{day.done}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(3, (day.done / max) * 100) },
                  ]}
                />
              </View>
              <Text style={styles.day}>
                {dateLabel(day.date, { weekday: 'short' }).replace('.', '')}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[common.card, common.row]}>
        <ProgressRing percent={stats.regularity} />
        <View style={common.grow}>
          <Text style={common.heading}>Regularność</Text>
          <Text style={[common.subtitle, { marginTop: 8 }]}>
            Każdy krok ma znaczenie. Liczy się powracanie, nie perfekcja.
          </Text>
        </View>
      </View>
      <Text style={common.small}>
        Regularność = wykonane / (wykonane + pominięte + niewykonane +
        dzisiejsze zaplanowane). Elastyczne cele tygodniowe rozliczamy po
        zakończeniu tygodnia. Wykres opiera się na dniach przypisanych do rutyn.
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  period: {
    color: colors.accentLight,
    backgroundColor: '#241d3c',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '600',
  },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 9,
  },
  number: { fontSize: 32, fontWeight: '800' },
  metricLabel: { fontSize: 10, color: colors.muted },
  chart: { flexDirection: 'row', gap: 10, paddingTop: 20 },
  column: { flex: 1, alignItems: 'center', gap: 10 },
  barTrack: {
    height: 100,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    backgroundColor: colors.accent,
    borderRadius: 7,
    width: '75%',
    maxWidth: 34,
  },
  count: { color: colors.text, fontSize: 12, fontWeight: '600' },
  day: { color: colors.muted, fontSize: 11 },
});
