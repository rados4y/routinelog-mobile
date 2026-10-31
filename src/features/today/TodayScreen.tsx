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
      title="RoutineLog"
      subtitle={dateLabel(today)}
      action={
        <View style={styles.brand}>
          <Text style={styles.brandText}>R.</Text>
        </View>
      }
    >
      <DateSelector
        today={today}
        selected={selected}
        onSelect={(date) => setSelected(date === today ? null : date)}
      />
      <View style={[common.card, styles.summary]}>
        <View style={common.row}>
          <View style={common.grow}>
            <Text style={styles.eyebrow}>MAŁE KROKI. WIELKA ZMIANA.</Text>
            <Text style={[common.heading, styles.dayTitle]}>
              {selectedTitle}
            </Text>
            <Text style={common.subtitle}>
              <Text style={styles.doneCount}>{progress.done}</Text> z{' '}
              {progress.total} rutyn wykonanych
            </Text>
          </View>
          <ProgressRing percent={progress.percent} />
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress.percent }}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${progress.percent}%` }]} />
        </View>
        <Text style={common.small}>
          {progress.total > 0 && progress.done === progress.total
            ? 'Dobra robota! Twój plan jest wykonany. ✨'
            : 'Każda wykonana rutyna to krok do przodu.'}
        </Text>
      </View>
      <View style={common.section}>
        <View style={common.spread}>
          <Text accessibilityRole="header" style={common.heading}>
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
  brand: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#41336a',
    backgroundColor: '#201a32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: colors.accentLight, fontSize: 21, fontWeight: '800' },
  summary: { borderColor: '#3a3055', backgroundColor: '#181520' },
  eyebrow: {
    color: colors.accentLight,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dayTitle: {
    fontSize: 24,
    marginTop: 12,
    marginBottom: 7,
    textTransform: 'capitalize',
  },
  doneCount: { color: colors.text, fontWeight: '700' },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: 6, backgroundColor: colors.accent, borderRadius: 4 },
});
