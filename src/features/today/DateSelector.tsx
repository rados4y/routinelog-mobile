import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { addDays, calendarDate, dateLabel } from '../../domain/dates';
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
      {Array.from({ length: 7 }, (_, index) => addDays(today, index - 3)).map(
        (date) => (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityLabel={dateLabel(date)}
            accessibilityState={{ selected: date === selected }}
            onPress={() => onSelect(date)}
            style={[styles.day, date === selected && styles.selected]}
          >
            <Text style={[styles.weekday, date === selected && styles.light]}>
              {dateLabel(date, { weekday: 'short' }).replace('.', '')}
            </Text>
            <Text style={[styles.number, date === selected && styles.light]}>
              {calendarDate(date).getDate()}
            </Text>
            <Text
              style={[
                styles.dot,
                { color: date === today ? colors.accentLight : 'transparent' },
              ]}
            >
              ●
            </Text>
          </Pressable>
        ),
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  row: { gap: 9 },
  day: {
    width: 48,
    paddingVertical: 11,
    alignItems: 'center',
    gap: 7,
    borderRadius: 17,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  weekday: {
    color: colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  number: { color: colors.text, fontSize: 20, fontWeight: '700' },
  light: { color: colors.text },
  dot: { fontSize: 7, height: 8 },
});
