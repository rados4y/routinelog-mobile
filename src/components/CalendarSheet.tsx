import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { addDays, dateLabel, localDate, weekday } from '../domain/dates';
import { monthStart, monthEnd, shiftMonth } from '../domain/schedule/windows';
import { occurrencesForDate } from '../domain/schedule';
import type { Routine } from '../domain/models';
import { useRoutines } from '../store/useRoutines';
import { categoryColors } from './HabitIcon';
import { useRoutineActions } from './RoutineActionsProvider';
import { nextActionLabel, statusLabels } from '../domain/status';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ToolButton } from './HabitScreen';
import { Button } from './Button';
import { entryBlockReason } from '../domain/entry';
import { useNow } from '../utils/useNow';
import { colors, common } from '../theme';
import { NoteDateMarker } from './NoteDateMarker';
import { useNoteDates } from '../features/notes/useNoteDates';

export function CalendarSheet({
  visible,
  onClose,
  selected,
  onSelect,
  routine,
}: {
  visible: boolean;
  onClose(): void;
  selected: string;
  onSelect?(date: string): void;
  routine?: Routine;
}) {
  const [month, setMonth] = useState(monthStart(selected));
  const [date, setDate] = useState(selected);
  const logs = useRoutines((state) => state.logs);
  const noteDates = useNoteDates();
  const { cycleStatus } = useRoutineActions();
  const saving = useRoutines((state) => state.saving);
  const error = useRoutines((state) => state.error);
  const { width } = useWindowDimensions();
  const cellWidth = (Math.min(width, 660) - 46) / 7;
  const days = Array.from(
    { length: Number(monthEnd(month).slice(-2)) },
    (_, i) => addDays(month, i),
  );
  const today = localDate(useNow());
  const log = routine
    ? logs.find(
        (item) => item.routineId === routine.id && item.scheduledFor === date,
      )
    : undefined;
  const reason = routine
    ? entryBlockReason(routine, date, 'calendar', Boolean(log), today)
    : undefined;
  const tint = routine ? categoryColors[routine.category] : colors.accentLight;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={routine ? routine.name : 'Choose date'}
    >
      <View style={common.spread}>
        <ToolButton
          icon="arrowLeft"
          label="Previous month"
          onPress={() => setMonth(shiftMonth(month, -1))}
        />
        <Text style={common.heading}>
          {dateLabel(month, { month: 'long', year: 'numeric' })}
        </Text>
        <ToolButton
          icon="arrowRight"
          label="Next month"
          onPress={() => setMonth(shiftMonth(month, 1))}
        />
      </View>
      {!!reason && (
        <Text accessibilityRole="alert" style={common.small}>
          {reason}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
      <View style={styles.grid}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <Text key={day} style={[styles.label, { width: cellWidth }]}>
            {day}
          </Text>
        ))}
        {Array.from({ length: weekday(month) - 1 }, (_, i) => (
          <View key={`blank-${i}`} style={{ width: cellWidth, height: 44 }} />
        ))}
        {days.map((value) => {
          const status = routine
            ? logs.find(
                (item) =>
                  item.routineId === routine.id && item.scheduledFor === value,
              )?.status
            : undefined;
          const canCycle =
            !routine ||
            !entryBlockReason(
              routine,
              value,
              'calendar',
              Boolean(status),
              today,
            );
          const planned = routine
            ? occurrencesForDate([routine], logs, value).length > 0
            : false;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={
                routine
                  ? `Status: ${routine.name}, ${dateLabel(value)}. ${statusLabels[status ?? 'pending']}. ${nextActionLabel(status)}`
                  : dateLabel(value)
              }
              accessibilityHint={
                [
                  noteDates.has(value) ? 'Has daily note' : '',
                  routine && !canCycle
                    ? entryBlockReason(
                        routine,
                        value,
                        'calendar',
                        Boolean(status),
                        today,
                      )
                    : '',
                ]
                  .filter(Boolean)
                  .join('. ') || undefined
              }
              accessibilityState={{
                selected: date === value,
                disabled: Boolean(routine) && saving,
              }}
              disabled={Boolean(routine) && saving}
              onPress={() => {
                setDate(value);
                if (routine) {
                  if (canCycle) cycleStatus(routine.id, value, 'calendar');
                } else {
                  onSelect?.(value);
                  onClose();
                }
              }}
              style={[
                styles.day,
                { width: cellWidth },
                planned && { borderColor: colors.warning },
                value === date && {
                  borderColor: tint,
                  backgroundColor: `${tint}24`,
                },
                status === 'done' && { backgroundColor: `${tint}55` },
                status === 'missed' && { borderColor: colors.danger },
                status === 'skipped' && {
                  borderColor: colors.warning,
                  backgroundColor: `${colors.warning}20`,
                },
                !canCycle && { opacity: 0.4 },
              ]}
            >
              <Text style={common.text}>{Number(value.slice(-2))}</Text>
              {noteDates.has(value) && (
                <View style={{ position: 'absolute', left: 3, bottom: 3 }}>
                  <NoteDateMarker
                    testID={`calendar-note-${value}`}
                    selected={date === value}
                  />
                </View>
              )}
              {status && (
                <View style={{ position: 'absolute', right: 1, bottom: 1 }}>
                  <Icon
                    name={
                      status === 'done'
                        ? 'check'
                        : status === 'missed'
                          ? 'close'
                          : 'skip'
                    }
                    size={12}
                    color={
                      status === 'done'
                        ? colors.success
                        : status === 'missed'
                          ? colors.danger
                          : colors.warning
                    }
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {days.some((day) => noteDates.has(day)) && (
        <View style={[common.row, { gap: 6 }]}>
          <Icon name="notes" size={14} color={colors.accentLight} />
          <Text style={common.small}>Daily note</Text>
        </View>
      )}
      {routine && (
        <>
          <Text style={common.subtitle}>
            {dateLabel(date)}
            {log
              ? ` · ${log.status === 'done' ? 'Done' : log.status === 'skipped' ? 'Skipped' : 'Not done'}`
              : ''}
          </Text>
          <Text style={common.small}>
            Tap a day: done → not done → skipped → unchecked. Manual entries do
            not change the schedule.
          </Text>
        </>
      )}
      {!routine && (
        <Button
          label="Go to today"
          onPress={() => {
            onSelect?.(today);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  label: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 12,
  },
  day: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.panelSecondary,
  },
});
