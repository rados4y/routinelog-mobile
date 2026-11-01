import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Screen, EmptyState } from '../../components/Screen';
import { ProgressRing } from '../../components/ProgressRing';
import { dateLabel, localDate } from '../../domain/dates';
import { completion, occurrencesForDate } from '../../domain/schedule';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import { useNow } from '../../utils/useNow';
import { DateSelector } from './DateSelector';
import { OccurrenceCard } from './OccurrenceCard';
import { NotionButton } from '../../integrations/notion/NotionButton';

export function TodayScreen() {
  const now = useNow();
  const today = localDate(now);
  const [chosenDate, setSelected] = useState<string | null>(null);
  const selected = chosenDate ?? today;
  const routines = useRoutines((s) => s.routines);
  const logs = useRoutines((s) => s.logs);
  const occurrences = occurrencesForDate(routines, logs, selected, now);
  const progress = completion(occurrences);
  const selectedTitle =
    selected === today ? 'Dzisiaj' : dateLabel(selected, { weekday: 'long' });

  return (
    <Screen
      compact
      title="RoutineLog"
      subtitle={dateLabel(today)}
      action={<NotionButton />}
    >
      <DateSelector
        today={today}
        selected={selected}
        onSelect={(date) => setSelected(date === today ? null : date)}
      />
      <View style={[common.card, styles.summary]}>
        <View style={common.row}>
          <View style={common.grow}>
            <Text style={styles.dayTitle}>{selectedTitle}</Text>
            <Text style={styles.summaryCount}>
              <Text style={styles.doneCount}>
                {progress.done} / {progress.total}
              </Text>{' '}
              wykonanych
            </Text>
          </View>
          <ProgressRing percent={progress.percent} size={48} />
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Realizacja planu dnia"
          accessibilityValue={{ min: 0, max: 100, now: progress.percent }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${progress.percent}%` }]} />
        </View>
      </View>
      <View style={styles.plan}>
        <View style={common.spread}>
          <Text accessibilityRole="header" style={styles.planTitle}>
            Twój plan dnia
          </Text>
          <Text style={common.small}>{occurrences.length} rutyn</Text>
        </View>
        {selected > today && (
          <Text style={common.subtitle}>
            Podgląd planu. Oznaczanie będzie dostępne w dniu rutyny.
          </Text>
        )}
        {occurrences.length ? (
          occurrences.map((occurrence) => (
            <OccurrenceCard
              key={occurrence.routine.id}
              occurrence={occurrence}
              future={selected > today}
            />
          ))
        ) : (
          <>
            <EmptyState
              icon="☀️"
              title="Chwila dla Ciebie"
              description="Nie masz rutyn zaplanowanych na ten dzień lub cele tygodniowe są już wykonane."
            />
            <Button
              label="Dodaj rutynę"
              icon="plus"
              onPress={() => router.push('/routine-editor')}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: 10,
    gap: 6,
    borderRadius: 16,
    borderColor: '#3a3055',
    backgroundColor: '#181520',
  },
  dayTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  summaryCount: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  doneCount: { color: colors.text, fontWeight: '700' },
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: 3, backgroundColor: colors.accent, borderRadius: 3 },
  plan: { gap: 8 },
  planTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
});
