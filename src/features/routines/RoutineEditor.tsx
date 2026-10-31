import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { Screen, EmptyState } from '../../components/Screen';
import { localDate } from '../../domain/dates';
import {
  categories,
  routineInputSchema,
  type RoutineInput,
  type Schedule,
} from '../../domain/models';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';
import { Chip, initialFrequency, ScheduleEditor } from './ScheduleEditor';

const emojis = [
  '💊',
  '💧',
  '🏃',
  '🧘',
  '📚',
  '🪴',
  '🧹',
  '☎️',
  '🧴',
  '🦷',
  '💪',
  '✅',
];
export function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useRoutines((s) => s.routines).find(
    (routine) => routine.id === id && !routine.deletedAt,
  );
  const save = useRoutines((s) => s.saveRoutine);
  const saving = useRoutines((s) => s.saving);
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '✅');
  const [category, setCategory] = useState<RoutineInput['category']>(
    existing?.category ?? 'Inne',
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [time, setTime] = useState(existing?.reminderTime ?? '08:00');
  const [note, setNote] = useState(existing?.note ?? '');
  const [frequency, setFrequency] = useState(() =>
    initialFrequency(existing?.schedule),
  );
  const [days, setDays] = useState(
    existing?.schedule.kind === 'weekdays' ? existing.schedule.days : [1, 3, 5],
  );
  const [interval, setInterval] = useState(
    existing?.schedule.kind === 'interval'
      ? String(existing.schedule.every)
      : '7',
  );
  const [anchor, setAnchor] = useState(
    existing?.schedule.kind === 'interval'
      ? existing.schedule.anchor
      : localDate(),
  );
  const [error, setError] = useState('');
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/routines');
  };
  const submit = async () => {
    setError('');
    const schedule: Schedule =
      frequency === 'daily'
        ? { kind: 'daily' }
        : frequency === 'business'
          ? { kind: 'weekdays', days: [1, 2, 3, 4, 5] }
          : frequency === 'days'
            ? { kind: 'weekdays', days }
            : frequency === 'interval'
              ? { kind: 'interval', every: Number(interval), anchor }
              : { kind: 'weeklyTarget', count: frequency === 'three' ? 3 : 1 };
    const parsed = routineInputSchema.safeParse({
      name,
      icon,
      category,
      active,
      schedule,
      target: existing?.target ?? null,
      unit: existing?.unit ?? null,
      reminderTime: time.trim(),
      note: note.trim(),
    });
    if (!parsed.success) {
      setError(
        'Sprawdź nazwę, ikonę, godzinę (HH:MM) i harmonogram. Wybierz co najmniej jeden dzień; odstęp musi być liczbą całkowitą od 1 do 3650, a pierwszy termin datą RRRR-MM-DD.',
      );
      return;
    }
    if (await save(parsed.data, id)) close();
  };
  if (id && !existing)
    return (
      <Screen title="Rutyna niedostępna">
        <EmptyState
          title="Nie znaleziono rutyny"
          description="Mogła zostać wcześniej usunięta."
        />
        <Button label="Wróć do rutyn" onPress={close} />
      </Screen>
    );
  return (
    <KeyboardAvoidingView
      style={common.grow}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        title={id ? 'Edytuj rutynę' : 'Nowa rutyna'}
        subtitle="Zbuduj nawyk, który pasuje do Ciebie"
        action={<Button label="Zamknij" icon="close" onPress={close} compact />}
      >
        <View style={common.card}>
          <View>
            <Text style={common.label}>Nazwa rutyny</Text>
            <TextInput
              accessibilityLabel="Nazwa rutyny"
              placeholder="np. 15 minut dla siebie"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              maxLength={100}
              style={common.field}
            />
          </View>
          <View>
            <Text style={common.label}>Ikona</Text>
            <View style={common.wrap}>
              {emojis.map((emoji) => (
                <Chip
                  key={emoji}
                  label={emoji}
                  selected={icon === emoji}
                  onPress={() => setIcon(emoji)}
                />
              ))}
            </View>
            <TextInput
              accessibilityLabel="Własna ikona emoji"
              value={icon}
              onChangeText={setIcon}
              maxLength={16}
              style={[common.field, { marginTop: 10 }]}
            />
          </View>
          <View>
            <Text style={common.label}>Kategoria</Text>
            <View style={common.wrap}>
              {categories.map((value) => (
                <Chip
                  key={value}
                  label={value}
                  selected={category === value}
                  onPress={() => setCategory(value)}
                />
              ))}
            </View>
          </View>
        </View>
        <View style={common.card}>
          <ScheduleEditor
            frequency={frequency}
            setFrequency={setFrequency}
            days={days}
            setDays={setDays}
            interval={interval}
            setInterval={setInterval}
            anchor={anchor}
            setAnchor={setAnchor}
          />
          <View>
            <Text style={common.label}>Godzina (HH:MM)</Text>
            <TextInput
              accessibilityLabel="Godzina"
              placeholder="08:00"
              placeholderTextColor={colors.muted}
              value={time}
              onChangeText={setTime}
              maxLength={5}
              keyboardType={
                Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'
              }
              style={common.field}
            />
            <Text style={[common.small, { marginTop: 8 }]}>
              Godzina porządkuje plan. Powiadomienia dodamy w kolejnym etapie.
            </Text>
          </View>
        </View>
        <View style={common.card}>
          <View>
            <Text style={common.label}>Notatka (opcjonalnie)</Text>
            <TextInput
              accessibilityLabel="Notatka"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={1000}
              placeholder="Co warto zapamiętać?"
              placeholderTextColor={colors.muted}
              style={[
                common.field,
                { minHeight: 90, textAlignVertical: 'top' },
              ]}
            />
          </View>
          <View style={common.spread}>
            <View style={common.grow}>
              <Text style={common.text}>Rutyna aktywna</Text>
              <Text style={common.small}>Pokaż ją w Twoim planie</Text>
            </View>
            <Switch
              accessibilityLabel="Rutyna aktywna"
              value={active}
              onValueChange={setActive}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
        </View>
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, lineHeight: 22 }}
          >
            {error}
          </Text>
        )}
        <Button
          label={saving ? 'Zapisywanie…' : 'Zapisz rutynę'}
          tone="primary"
          icon="check"
          disabled={saving}
          onPress={() => void submit()}
        />
        <Button label="Anuluj" disabled={saving} onPress={close} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
