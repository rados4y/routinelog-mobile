import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import {
  addDays,
  calendarDate,
  dateLabel,
  daysBetween,
  weekday,
} from '../../domain/dates';
import { colors } from '../../theme';

export function DateSelector({
  today,
  selected,
  onSelect,
}: {
  today: string;
  selected: string;
  onSelect(date: string): void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {Array.from({ length: 7 }, (_, index) =>
        addDays(
          Math.abs(daysBetween(today, selected)) > 3 ? selected : today,
          index - 3,
        ),
      ).map((date) => (
        <Pressable
          key={date}
          accessibilityRole="button"
          accessibilityLabel={dateLabel(date)}
          accessibilityState={{ selected: date === selected }}
          onPress={() => onSelect(date)}
          style={[styles.day, date === selected && styles.selected]}
        >
          <Text style={[styles.weekday, date === selected && styles.light]}>
            {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'][weekday(date) - 1]}
          </Text>
          <Text style={[styles.number, date === selected && styles.light]}>
            {calendarDate(date).getDate()}
          </Text>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  date === today ? colors.accentLight : 'transparent',
              },
            ]}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  row: { flexGrow: 1, justifyContent: 'space-between', gap: 4 },
  day: {
    width: 44,
    minHeight: 62,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
    borderRadius: 18,
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  weekday: {
    color: colors.muted,
    fontSize: 10,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  number: { color: colors.text, fontSize: 20, fontWeight: '700' },
  light: { color: colors.text },
  dot: { width: 3, height: 3, borderRadius: 2 },
});
