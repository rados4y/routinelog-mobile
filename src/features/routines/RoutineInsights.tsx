import { View, Text } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { getStats } from '../../domain/insights';
import type { Routine, RoutineLog } from '../../domain/models';
import { colors, common } from '../../theme';
import { categoryColors } from '../../components/HabitIcon';
import { dateLabel } from '../../domain/dates';

export function RoutineInsights({
  routine,
  logs,
  onClose,
}: {
  routine: Routine;
  logs: RoutineLog[];
  onClose(): void;
}) {
  const stats = getStats([routine], logs, new Date(), 30);
  const week = getStats([routine], logs);
  const max = Math.max(1, ...week.activity.map((day) => day.done));
  const tint = categoryColors[routine.category];
  return (
    <Sheet visible title={routine.name} onClose={onClose}>
      <Text style={common.heading}>Ostatnie 30 dni</Text>
      <View style={common.wrap}>
        {[
          ['Wykonane', stats.done],
          ['Pominięte', stats.skipped],
          ['Niewykonane', stats.missed],
          ['Regularność', `${stats.regularity}%`],
        ].map(([label, value]) => (
          <View
            key={label}
            style={[common.card, { minWidth: 125, flex: 1, padding: 14 }]}
          >
            <Text style={common.small}>{label}</Text>
            <Text style={common.heading}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={common.subtitle}>Aktywność · ostatnie 7 dni</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        {week.activity.map((day) => (
          <View
            key={day.date}
            style={{ flex: 1, alignItems: 'center', gap: 6 }}
          >
            <Text style={common.small}>{day.done}</Text>
            <View
              style={{
                height: day.done ? (70 * day.done) / max : 3,
                width: '80%',
                borderRadius: 5,
                backgroundColor: day.done ? tint : colors.border,
              }}
            />
            <Text style={common.small}>
              {dateLabel(day.date, { weekday: 'short' }).replace('.', '')}
            </Text>
          </View>
        ))}
      </View>
      <Text style={common.small}>
        Seria na karcie to kolejne wykonania w ostatnich 30 dniach. Regularność
        uwzględnia zapisane decyzje i zakończone terminy; otwarte cele
        elastyczne nie są dziennym niewykonaniem.
      </Text>
    </Sheet>
  );
}
