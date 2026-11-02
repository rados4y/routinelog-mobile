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
import { occurrencesForDate, routineForEntry } from '../domain/schedule';
import type { Routine } from '../domain/models';
import { useRoutines } from '../store/useRoutines';
import { categoryColors } from './HabitIcon';
import { useRoutineActions } from './RoutineActionsProvider';
import { nextActionLabel, statusLabels } from '../domain/status';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ToolButton } from './HabitScreen';
import { Button } from './Button';
import { colors, common } from '../theme';

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
  const { requestStatus: setStatus, cycleStatus } = useRoutineActions();
  const saving = useRoutines((state) => state.saving);
  const { width } = useWindowDimensions();
  const cellWidth = (Math.min(width, 660) - 46) / 7;
  const days = Array.from(
    { length: Number(monthEnd(month).slice(-2)) },
    (_, i) => addDays(month, i),
  );
  const today = localDate();
  const log = routine
    ? logs.find(
        (item) => item.routineId === routine.id && item.scheduledFor === date,
      )
    : undefined;
  const canMark =
    routine && date <= today && Boolean(log || routineForEntry(routine, date));
  const tint = routine ? categoryColors[routine.category] : colors.accentLight;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={routine ? routine.name : 'Wybierz datę'}
    >
      <View style={common.spread}>
        <ToolButton
          icon="arrowLeft"
          label="Poprzedni miesiąc"
          onPress={() => setMonth(shiftMonth(month, -1))}
        />
        <Text style={common.heading}>
          {dateLabel(month, { month: 'long', year: 'numeric' })}
        </Text>
        <ToolButton
          icon="arrowRight"
          label="Następny miesiąc"
          onPress={() => setMonth(shiftMonth(month, 1))}
        />
      </View>
      <View style={styles.grid}>
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((day) => (
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
            (value <= today &&
              Boolean(status || routineForEntry(routine, value)));
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
              accessibilityState={{
                selected: date === value,
                disabled: !canCycle || (Boolean(routine) && saving),
              }}
              disabled={!canCycle || (Boolean(routine) && saving)}
              onPress={() => {
                setDate(value);
                if (routine) cycleStatus(routine.id, value);
                else {
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
      {routine && (
        <>
          <Text style={common.subtitle}>
            {dateLabel(date)}
            {log
              ? ` · ${log.status === 'done' ? 'Wykonane' : log.status === 'skipped' ? 'Pominięte' : 'Niewykonane'}`
              : ''}
          </Text>
          <View style={common.wrap}>
            <Button
              label="Wykonane"
              disabled={!canMark || saving}
              tone="success"
              onPress={() => void setStatus(routine.id, date, 'done')}
            />
            <Button
              label="Niewykonane"
              disabled={!canMark || saving}
              tone="danger"
              onPress={() => setStatus(routine.id, date, 'missed')}
            />
            <Button
              label="Pomiń"
              disabled={!canMark || saving}
              tone="warning"
              onPress={() => void setStatus(routine.id, date, 'skipped')}
            />
            {log && (
              <Button
                label="Cofnij status"
                disabled={saving}
                onPress={() => void setStatus(routine.id, date, 'pending')}
              />
            )}
          </View>
          {!canMark && !log && (
            <Text style={common.small}>
              Tego dnia rutyna nie jest zaplanowana lub termin jest w
              przyszłości.
            </Text>
          )}
        </>
      )}
      {!routine && (
        <Button
          label="Przejdź do dzisiaj"
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
