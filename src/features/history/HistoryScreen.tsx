import { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Screen, EmptyState } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { addDays, dateLabel, localDate } from '../../domain/dates';
import { historyForRange } from '../../domain/history';
import { useRoutines } from '../../store/useRoutines';
import { common } from '../../theme';
import { useNow } from '../../utils/useNow';

const sources = {
  app: 'Aplikacja',
  chatgpt: 'ChatGPT',
  automation: 'Automatycznie',
};
export function HistoryScreen() {
  const routines = useRoutines((s) => s.routines);
  const logs = useRoutines((s) => s.logs);
  const setStatus = useRoutines((s) => s.setStatus);
  const saving = useRoutines((s) => s.saving);
  const now = useNow();
  const [days, setDays] = useState(30);
  const entries = historyForRange(
    routines,
    logs,
    addDays(localDate(now), 1 - days),
    localDate(now),
    now,
  );
  return (
    <Screen
      title="Historia"
      subtitle={`Twoje małe zwycięstwa · ostatnie ${days} dni`}
    >
      <View style={common.section}>
        {!entries.length && (
          <EmptyState
            icon="◷"
            title="Tutaj zapisze się Twój rytm"
            description="Oznacz pierwszą rutynę jako wykonaną lub pominiętą. Zakończone dni uzupełnimy o niewykonania."
          />
        )}
        {entries.map((entry) => (
          <View key={entry.id} style={common.card}>
            <View style={common.row}>
              <Text style={{ fontSize: 27 }}>{entry.routineIcon}</Text>
              <View style={common.grow}>
                <Text style={[common.text, { fontWeight: '700' }]}>
                  {entry.routineName}
                </Text>
                <Text style={common.small}>
                  {dateLabel(entry.scheduledFor, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <StatusBadge status={entry.status} />
            </View>
            <Text style={common.small}>
              {entry.completedAt
                ? `Wykonano o ${new Date(entry.completedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                : entry.status === 'skipped'
                  ? 'Świadoma przerwa'
                  : 'Zakończony termin'}{' '}
              · {sources[entry.source]}
            </Text>
            {entry.value !== null && (
              <Text style={common.text}>Wartość: {entry.value}</Text>
            )}
            {!!entry.note && <Text style={common.subtitle}>{entry.note}</Text>}
            {entry.inferred && entry.missingCount > 1 && (
              <Text style={common.small}>
                Niewykonane: {entry.missingCount}
              </Text>
            )}
            {!entry.inferred && (
              <Button
                label="Cofnij status"
                icon="undo"
                disabled={saving}
                onPress={() =>
                  void setStatus(entry.routineId, entry.scheduledFor, 'pending')
                }
                compact
              />
            )}
            {entry.inferred && (
              <Button
                label="Przejdź do planu"
                onPress={() => router.push('/')}
                compact
              />
            )}
          </View>
        ))}
      </View>
      <Button
        label="Pokaż wcześniejsze 30 dni"
        onPress={() => setDays((count) => count + 30)}
      />
    </Screen>
  );
}
