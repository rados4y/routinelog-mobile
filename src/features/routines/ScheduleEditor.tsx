import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { Schedule } from '../../domain/models';
import { colors, common } from '../../theme';

export type Frequency =
  'daily' | 'business' | 'days' | 'three' | 'weekly' | 'interval';
const choices: { key: Frequency; label: string }[] = [
  { key: 'daily', label: 'Codziennie' },
  { key: 'business', label: 'Pn–Pt' },
  { key: 'days', label: 'Wybrane dni' },
  { key: 'three', label: '3× w tygodniu' },
  { key: 'weekly', label: 'Raz w tygodniu' },
  { key: 'interval', label: 'Co N dni' },
];
export function initialFrequency(schedule?: Schedule): Frequency {
  if (!schedule || schedule.kind === 'daily') return 'daily';
  if (schedule.kind === 'interval') return 'interval';
  if (schedule.kind === 'weeklyTarget')
    return schedule.count === 1 ? 'weekly' : 'three';
  return schedule.days.length === 5 &&
    [1, 2, 3, 4, 5].every((day) => schedule.days.includes(day))
    ? 'business'
    : 'days';
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text
        style={[styles.chipText, selected && { color: colors.accentLight }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function ScheduleEditor({
  frequency,
  setFrequency,
  days,
  setDays,
  interval,
  setInterval,
  anchor,
  setAnchor,
}: {
  frequency: Frequency;
  setFrequency(value: Frequency): void;
  days: number[];
  setDays(value: number[]): void;
  interval: string;
  setInterval(value: string): void;
  anchor: string;
  setAnchor(value: string): void;
}) {
  return (
    <View style={common.section}>
      <View>
        <Text style={common.label}>Częstotliwość</Text>
        <View style={common.wrap}>
          {choices.map((choice) => (
            <Chip
              key={choice.key}
              label={choice.label}
              selected={frequency === choice.key}
              onPress={() => setFrequency(choice.key)}
            />
          ))}
        </View>
      </View>
      {frequency === 'days' && (
        <View>
          <Text style={common.label}>Dni tygodnia</Text>
          <View style={common.wrap}>
            {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((label, index) => (
              <Chip
                key={label}
                label={label}
                selected={days.includes(index + 1)}
                onPress={() =>
                  setDays(
                    days.includes(index + 1)
                      ? days.filter((day) => day !== index + 1)
                      : [...days, index + 1],
                  )
                }
              />
            ))}
          </View>
        </View>
      )}
      {(frequency === 'three' || frequency === 'weekly') && (
        <Text style={common.subtitle}>
          Cel elastyczny: samodzielnie wybierasz dni wykonania. Tydzień trwa od
          poniedziałku do niedzieli.
        </Text>
      )}
      {frequency === 'interval' && (
        <>
          <View>
            <Text style={common.label}>Odstęp w dniach</Text>
            <TextInput
              accessibilityLabel="Odstęp w dniach"
              value={interval}
              onChangeText={setInterval}
              keyboardType="number-pad"
              style={common.field}
            />
            <View style={[common.wrap, { marginTop: 8 }]}>
              {[7, 30].map((value) => (
                <Chip
                  key={value}
                  label={`Co ${value} dni`}
                  selected={interval === String(value)}
                  onPress={() => setInterval(String(value))}
                />
              ))}
            </View>
          </View>
          <View>
            <Text style={common.label}>Pierwszy termin (RRRR-MM-DD)</Text>
            <TextInput
              accessibilityLabel="Pierwszy termin"
              value={anchor}
              onChangeText={setAnchor}
              autoCapitalize="none"
              style={common.field}
            />
          </View>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.panelSecondary,
  },
  selected: { borderColor: colors.accent, backgroundColor: '#241d3c' },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
