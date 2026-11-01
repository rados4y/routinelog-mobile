import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
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
        ),
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  row: { flexGrow: 1, justifyContent: 'space-between', gap: 4 },
  day: {
    width: 44,
    minHeight: 54,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  weekday: {
    color: colors.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  number: { color: colors.text, fontSize: 18, fontWeight: '700' },
  light: { color: colors.text },
  dot: { width: 3, height: 3, borderRadius: 2 },
});
