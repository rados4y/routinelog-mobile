import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { localDate } from '../../domain/dates';
import { scheduleSchema, type Schedule } from '../../domain/models';
import { scheduleLabel } from '../../domain/schedule';
import { colors, common } from '../../theme';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icon';

type Frequency =
  'daily' | 'weekdays' | 'monthly' | 'yearly' | 'target' | 'interval';
const options: { key: Frequency; label: string }[] = [
  { key: 'daily', label: 'Codziennie' },
  { key: 'weekdays', label: 'Wybrane dni tygodnia' },
  { key: 'monthly', label: 'Wybrane dni miesiąca' },
  { key: 'yearly', label: 'Wybrane dni roku' },
  { key: 'target', label: 'Kilka razy w okresie' },
  { key: 'interval', label: 'Co określoną liczbę dni' },
];
const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const toggle = (values: number[], value: number) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value].sort((a, b) => a - b);
function frequencyOf(schedule: Schedule): Frequency {
  switch (schedule.kind) {
    case 'monthlyDays':
    case 'monthlyWeekdays':
      return 'monthly';
    case 'weeklyTarget':
    case 'monthlyTarget':
      return 'target';
    case 'yearlyDates':
      return 'yearly';
    default:
      return schedule.kind;
  }
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
      <Text style={[styles.chipText, selected && { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: Schedule;
  onChange(value: Schedule): void;
}) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<Schedule>(schedule);
  const [yearMonth, setYearMonth] = useState(1);
  const { width } = useWindowDimensions();
  const dayWidth = (Math.min(width, 660) - 46) / 7;
  const frequency = frequencyOf(draft);
  const valid = scheduleSchema.safeParse(draft);
  const select = (value: Frequency) => {
    if (value === frequency) return;
    const defaults: Record<Frequency, Schedule> = {
      daily: { kind: 'daily' },
      weekdays: { kind: 'weekdays', days: [1] },
      monthly: { kind: 'monthlyDays', days: [], lastDay: true, flexible: true },
      yearly: { kind: 'yearlyDates', dates: [], flexible: false },
      target: { kind: 'weeklyTarget', count: 1 },
      interval: { kind: 'interval', every: 7, anchor: localDate() },
    };
    setDraft(defaults[value]);
  };
  const choiceSwitch = (
    label: string,
    value: boolean,
    change: (value: boolean) => void,
    round = false,
  ) => (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => change(!value)}
      style={{
        minWidth: 56,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {round ? (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: value ? colors.accent : colors.muted,
            backgroundColor: value ? colors.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {value && <Icon name="check" color={colors.background} size={22} />}
        </View>
      ) : (
        <View
          style={{
            width: 54,
            height: 31,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#717171',
            backgroundColor: value ? colors.accent : '#393939',
            padding: 3,
          }}
        >
          <View
            style={{
              width: 21,
              height: 21,
              borderRadius: 14,
              backgroundColor: value ? colors.text : '#777777',
              alignSelf: value ? 'flex-end' : 'flex-start',
            }}
          />
        </View>
      )}
    </Pressable>
  );
  const flexibleSwitch = (value: boolean, change: (value: boolean) => void) => (
    <View style={styles.setting}>
      <View style={common.grow}>
        <Text style={common.text}>Elastycznie</Text>
        <Text style={common.small}>
          Pokazuj każdego dnia do wykonania lub pominięcia.
        </Text>
      </View>
      {choiceSwitch('Elastycznie', value, change, true)}
    </View>
  );
  const dayButtons = (
    total: number,
    selected: (day: number) => boolean,
    press: (day: number) => void,
    last?: { selected: boolean; press(): void },
  ) => (
    <View style={styles.grid}>
      {Array.from({ length: total }, (_, i) => i + 1).map((day) => (
        <Pressable
          key={day}
          accessibilityRole="button"
          accessibilityLabel={`Dzień ${day}`}
          accessibilityState={{ selected: selected(day) }}
          onPress={() => press(day)}
          style={[
            styles.day,
            { width: dayWidth },
            selected(day) && styles.selected,
          ]}
        >
          <Text style={styles.chipText}>{day}</Text>
        </Pressable>
      ))}
      {last && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ostatni dzień miesiąca"
          accessibilityState={{ selected: last.selected }}
          onPress={last.press}
          style={[
            styles.day,
            { width: dayWidth * 1.5 },
            last.selected && styles.selected,
          ]}
        >
          <Text style={styles.chipText}>Ostatni</Text>
        </Pressable>
      )}
    </View>
  );
  return (
    <>
      <View>
        <Text style={common.label}>Częstotliwość</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ustaw częstotliwość"
          onPress={() => {
            setDraft(schedule);
            setVisible(true);
          }}
          style={[common.field, common.spread]}
        >
          <Text style={[common.text, common.grow]}>
            {scheduleLabel(schedule)}
          </Text>
          <Icon name="arrowRight" />
        </Pressable>
      </View>
      <Sheet
        fullScreen
        visible={visible}
        title="Jak często chcesz to robić?"
        onClose={() => setVisible(false)}
        footer={
          <View style={{ flexDirection: 'row' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Anuluj częstotliwość"
              onPress={() => setVisible(false)}
              style={styles.footerAction}
            >
              <Text style={[common.text, { fontSize: 13, fontWeight: '700' }]}>
                ZAMKNIJ
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Potwierdź częstotliwość"
              disabled={!valid.success}
              accessibilityState={{ disabled: !valid.success }}
              onPress={() => {
                if (valid.success) {
                  onChange(valid.data);
                  setVisible(false);
                }
              }}
              style={styles.footerAction}
            >
              <Text
                style={{
                  color: valid.success ? colors.accent : colors.muted,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                POTWIERDŹ
              </Text>
            </Pressable>
          </View>
        }
      >
        {options.map((option) => (
          <View key={option.key} style={{ gap: 8 }}>
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: frequency === option.key }}
              aria-checked={frequency === option.key}
              onPress={() => select(option.key)}
              style={styles.radioRow}
            >
              <View
                style={[
                  styles.radio,
                  frequency === option.key && styles.radioSelected,
                ]}
              >
                {frequency === option.key && <View style={styles.radioDot} />}
              </View>
              <Text style={common.text}>{option.label}</Text>
            </Pressable>
            {frequency === option.key && (
              <>
                {draft.kind === 'weekdays' && (
                  <>
                    <View style={common.wrap}>
                      {weekdays.map((label, i) => (
                        <Chip
                          key={label}
                          label={label}
                          selected={draft.days.includes(i + 1)}
                          onPress={() =>
                            setDraft({
                              ...draft,
                              days: toggle(draft.days, i + 1),
                            })
                          }
                        />
                      ))}
                    </View>
                    {flexibleSwitch(draft.flexible ?? false, (value) =>
                      setDraft({ ...draft, flexible: value }),
                    )}
                  </>
                )}
                {draft.kind === 'monthlyDays' && (
                  <>
                    {dayButtons(
                      31,
                      (day) => draft.days.includes(day),
                      (day) =>
                        setDraft({ ...draft, days: toggle(draft.days, day) }),
                      {
                        selected: draft.lastDay,
                        press: () =>
                          setDraft({ ...draft, lastDay: !draft.lastDay }),
                      },
                    )}
                    <Text style={styles.hint}>
                      Wybierz co najmniej jeden dzień
                    </Text>
                    {flexibleSwitch(draft.flexible, (value) =>
                      setDraft({ ...draft, flexible: value }),
                    )}
                  </>
                )}
                {draft.kind === 'monthlyWeekdays' && (
                  <>
                    <View style={common.wrap}>
                      {[1, 2, 3, 4, 5].map((week) => (
                        <Chip
                          key={week}
                          label={`${week}. tydzień`}
                          selected={draft.weeks.includes(week)}
                          onPress={() =>
                            setDraft({
                              ...draft,
                              weeks: toggle(draft.weeks, week),
                            })
                          }
                        />
                      ))}
                      <Chip
                        label="Ostatni tydzień"
                        selected={draft.lastWeek}
                        onPress={() =>
                          setDraft({ ...draft, lastWeek: !draft.lastWeek })
                        }
                      />
                    </View>
                    <View style={common.wrap}>
                      {weekdays.map((label, i) => (
                        <Chip
                          key={label}
                          label={label}
                          selected={draft.days.includes(i + 1)}
                          onPress={() =>
                            setDraft({
                              ...draft,
                              days: toggle(draft.days, i + 1),
                            })
                          }
                        />
                      ))}
                    </View>
                    {flexibleSwitch(draft.flexible, (value) =>
                      setDraft({ ...draft, flexible: value }),
                    )}
                  </>
                )}
                {(draft.kind === 'monthlyDays' ||
                  draft.kind === 'monthlyWeekdays') && (
                  <View style={styles.setting}>
                    <Text style={[common.text, common.grow]}>
                      Użyj dni tygodnia w miesiącu
                    </Text>
                    {choiceSwitch(
                      'Użyj dni tygodnia w miesiącu',
                      draft.kind === 'monthlyWeekdays',
                      (value) =>
                        setDraft(
                          value
                            ? {
                                kind: 'monthlyWeekdays',
                                weeks: [],
                                lastWeek: true,
                                days: [1],
                                flexible: draft.flexible,
                              }
                            : {
                                kind: 'monthlyDays',
                                days: [],
                                lastDay: true,
                                flexible: draft.flexible,
                              },
                        ),
                    )}
                  </View>
                )}
                {draft.kind === 'yearlyDates' && (
                  <>
                    <View style={common.wrap}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (month) => (
                          <Chip
                            key={month}
                            label={new Date(
                              2000,
                              month - 1,
                              1,
                            ).toLocaleDateString('pl-PL', { month: 'short' })}
                            selected={yearMonth === month}
                            onPress={() => setYearMonth(month)}
                          />
                        ),
                      )}
                    </View>
                    {dayButtons(
                      new Date(2000, yearMonth, 0).getDate(),
                      (day) =>
                        draft.dates.some(
                          (item) =>
                            item.month === yearMonth && item.day === day,
                        ),
                      (day) =>
                        setDraft({
                          ...draft,
                          dates: draft.dates.some(
                            (item) =>
                              item.month === yearMonth && item.day === day,
                          )
                            ? draft.dates.filter(
                                (item) =>
                                  item.month !== yearMonth || item.day !== day,
                              )
                            : [...draft.dates, { month: yearMonth, day }],
                        }),
                    )}
                    <Text style={common.small}>
                      {draft.dates.length
                        ? scheduleLabel(draft)
                        : 'Wybierz daty w jednym lub kilku miesiącach.'}
                    </Text>
                    {flexibleSwitch(draft.flexible, (value) =>
                      setDraft({ ...draft, flexible: value }),
                    )}
                  </>
                )}
                {(draft.kind === 'weeklyTarget' ||
                  draft.kind === 'monthlyTarget') && (
                  <>
                    <View style={common.wrap}>
                      <Chip
                        label="W tygodniu"
                        selected={draft.kind === 'weeklyTarget'}
                        onPress={() =>
                          setDraft({
                            kind: 'weeklyTarget',
                            count: Math.min(7, draft.count),
                          })
                        }
                      />
                      <Chip
                        label="W miesiącu"
                        selected={draft.kind === 'monthlyTarget'}
                        onPress={() =>
                          setDraft({
                            kind: 'monthlyTarget',
                            count: draft.count,
                          })
                        }
                      />
                    </View>
                    <Text style={common.label}>Liczba wykonań</Text>
                    <TextInput
                      accessibilityLabel="Liczba wykonań"
                      keyboardType="number-pad"
                      value={draft.count ? String(draft.count) : ''}
                      onChangeText={(value) =>
                        setDraft({ ...draft, count: Number(value) })
                      }
                      style={common.field}
                    />
                    <Text style={common.small}>
                      Wybierasz dowolne dni w okresie. Niewykonanie oceniamy po
                      jego zakończeniu.
                    </Text>
                  </>
                )}
                {draft.kind === 'interval' && (
                  <>
                    <Text style={common.label}>Odstęp w dniach</Text>
                    <TextInput
                      accessibilityLabel="Odstęp w dniach"
                      keyboardType="number-pad"
                      style={common.field}
                      value={draft.every ? String(draft.every) : ''}
                      onChangeText={(value) =>
                        setDraft({ ...draft, every: Number(value) })
                      }
                    />
                    <View style={common.wrap}>
                      {[7, 30].map((every) => (
                        <Chip
                          key={every}
                          label={`Co ${every} dni`}
                          selected={draft.every === every}
                          onPress={() => setDraft({ ...draft, every })}
                        />
                      ))}
                    </View>
                    <Text style={common.label}>
                      Pierwszy termin (RRRR-MM-DD)
                    </Text>
                    <TextInput
                      accessibilityLabel="Pierwszy termin"
                      style={common.field}
                      value={draft.anchor}
                      onChangeText={(anchor) => setDraft({ ...draft, anchor })}
                    />
                  </>
                )}
              </>
            )}
          </View>
        ))}
        {!valid.success && (
          <Text accessibilityRole="alert" style={{ color: colors.warning }}>
            Wybierz poprawne dni lub liczbę wykonań, aby potwierdzić.
          </Text>
        )}
      </Sheet>
    </>
  );
}
const styles = StyleSheet.create({
  footerAction: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.panelSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.accent },
  radioDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    rowGap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  day: {
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.panelSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
  },
  hint: { color: colors.muted, textAlign: 'center', fontSize: 13 },
});
