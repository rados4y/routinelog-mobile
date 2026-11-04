import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/Screen';
import { HabitScreen, ToolButton } from '../../components/HabitScreen';
import { HabitIcon } from '../../components/HabitIcon';
import { StatusBadge } from '../../components/StatusBadge';
import { Sheet } from '../../components/Sheet';
import { addDays, dateLabel, localDate } from '../../domain/dates';
import { historyForRange, type HistoryEntry } from '../../domain/history';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import { useNow } from '../../utils/useNow';
import { locale } from '../../i18n/en';

const sources = {
  app: 'App',
  chatgpt: 'ChatGPT',
  automation: 'Automatic',
  notion: 'Notion',
};
export function HistoryScreen() {
  const routines = useRoutines((s) => s.routines);
  const logs = useRoutines((s) => s.logs);
  const setStatus = useRoutines((s) => s.setStatus);
  const saving = useRoutines((s) => s.saving);
  const now = useNow();
  const [days, setDays] = useState(30);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const entries = historyForRange(
    routines,
    logs,
    addDays(localDate(now), 1 - days),
    localDate(now),
    now,
  );
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries)
    groups.set(entry.scheduledFor, [
      ...(groups.get(entry.scheduledFor) ?? []),
      entry,
    ]);
  return (
    <>
      <HabitScreen
        title="History"
        addRoutine={false}
        fixed={
          <Text style={styles.period}>
            Last {days} days · {entries.length}{' '}
            {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        }
      >
        {!entries.length && (
          <EmptyState
            icon="◷"
            title="Your progress starts here"
            description="Complete or skip a routine to start your history."
          />
        )}
        {[...groups].map(([date, items]) => (
          <View key={date} style={{ gap: 8 }}>
            <Text style={styles.date}>
              {date === localDate(now)
                ? 'Today'
                : dateLabel(date, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
            </Text>
            <View style={styles.group}>
              {items.map((entry, index) => {
                const routine = routines.find(
                  (item) => item.id === entry.routineId,
                );
                return (
                  <View
                    key={entry.id}
                    testID={`history-entry-${entry.id}`}
                    style={[styles.row, index > 0 && styles.divider]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`History details: ${entry.routineName}, ${dateLabel(date)}`}
                      onPress={() => setSelected(entry)}
                      style={styles.body}
                    >
                      <HabitIcon
                        routine={{
                          icon: entry.routineIcon,
                          category: routine?.category ?? 'Inne',
                        }}
                        small
                      />
                      <View style={common.grow}>
                        <Text numberOfLines={2} style={styles.name}>
                          {entry.routineName}
                        </Text>
                        <Text style={common.small}>
                          {entry.completedAt
                            ? new Date(entry.completedAt).toLocaleTimeString(
                                locale,
                                { hour: '2-digit', minute: '2-digit' },
                              )
                            : entry.inferred
                              ? 'Scheduled'
                              : 'Recorded'}{' '}
                          · {sources[entry.source]}
                        </Text>
                      </View>
                      <StatusBadge status={entry.status} />
                    </Pressable>
                    {!entry.inferred && (
                      <ToolButton
                        icon="undo"
                        label={`Undo status: ${entry.routineName}`}
                        disabled={saving}
                        onPress={() =>
                          void setStatus(
                            entry.routineId,
                            entry.scheduledFor,
                            'pending',
                          )
                        }
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <Button
          label="Load earlier 30 days"
          onPress={() => setDays((count) => count + 30)}
        />
      </HabitScreen>
      {selected && (
        <Sheet
          visible
          title={selected.routineName}
          onClose={() => setSelected(null)}
        >
          <Text style={common.subtitle}>
            {dateLabel(selected.scheduledFor, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · {sources[selected.source]}
          </Text>
          <StatusBadge status={selected.status} />
          {selected.value !== null && (
            <Text style={common.text}>Value: {selected.value}</Text>
          )}
          {!!selected.note && (
            <Text style={common.subtitle}>{selected.note}</Text>
          )}
          {!!selected.checklist?.length && (
            <View style={{ gap: 8 }}>
              <Text style={common.label}>Confirmed steps</Text>
              {selected.checklist.map((item) => (
                <Text key={item.id} style={common.text}>
                  ✓ {item.text}
                </Text>
              ))}
            </View>
          )}
          {selected.inferred && selected.missingCount > 1 && (
            <Text style={common.small}>Missed: {selected.missingCount}</Text>
          )}
          {selected.inferred && (
            <Button
              label="Open daily plan"
              onPress={() => {
                setSelected(null);
                router.push('/');
              }}
            />
          )}
        </Sheet>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  period: {
    color: colors.muted,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  group: {
    backgroundColor: colors.panel,
    borderRadius: 22,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 2,
    paddingVertical: 10,
    minHeight: 76,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  name: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
});
