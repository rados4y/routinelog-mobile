import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState } from '../../components/Screen';
import type { Routine } from '../../domain/models';
import { scheduleLabel } from '../../domain/schedule';
import { useRoutines } from '../../store/useRoutines';
import { colors, common } from '../../theme';

export function RoutinesScreen() {
  const routines = useRoutines((s) => s.routines)
    .filter((routine) => !routine.deletedAt)
    .sort((a, b) => a.reminderTime.localeCompare(b.reminderTime));
  const saving = useRoutines((s) => s.saving);
  const toggle = useRoutines((s) => s.toggleRoutine);
  const remove = useRoutines((s) => s.deleteRoutine);
  const [deleting, setDeleting] = useState<Routine | null>(null);
  return (
    <View style={common.grow}>
      <Screen
        title="Twoje rutyny"
        subtitle={`${routines.filter((routine) => routine.active).length} aktywnych · Twój rytm, Twoje zasady`}
      >
        <View style={styles.hint}>
          <Text style={styles.hintIcon}>✦</Text>
          <Text style={[common.subtitle, common.grow]}>
            Nie musisz robić wszystkiego naraz. Zacznij od jednej dobrej rutyny.
          </Text>
        </View>
        <View style={common.section}>
          {!routines.length && (
            <EmptyState
              title="Zacznij od małego kroku"
              description="Dodaj swoją pierwszą rutynę przyciskiem +."
            />
          )}
          {routines.map((routine) => (
            <View
              key={routine.id}
              testID={`routine-${routine.id}`}
              style={common.card}
            >
              <View style={common.row}>
                <Text style={styles.emoji}>{routine.icon}</Text>
                <View style={common.grow}>
                  <Text style={common.heading}>{routine.name}</Text>
                  <Text style={common.small}>
                    {routine.category} · {routine.reminderTime}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.state,
                    { color: routine.active ? colors.success : colors.muted },
                  ]}
                >
                  {routine.active ? 'Aktywna' : 'Wyłączona'}
                </Text>
              </View>
              <Text style={common.subtitle}>
                {scheduleLabel(routine.schedule)}
              </Text>
              <View style={common.wrap}>
                <Button
                  label="Edytuj"
                  icon="edit"
                  onPress={() =>
                    router.push({
                      pathname: '/routine-editor',
                      params: { id: routine.id },
                    })
                  }
                  compact
                />
                <Button
                  label={routine.active ? 'Wyłącz' : 'Włącz'}
                  disabled={saving}
                  onPress={() => void toggle(routine.id)}
                  compact
                />
                <Button
                  label="Usuń"
                  tone="danger"
                  disabled={saving}
                  onPress={() => setDeleting(routine)}
                  compact
                />
              </View>
            </View>
          ))}
        </View>
      </Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dodaj rutynę"
        onPress={() => router.push('/routine-editor')}
        style={styles.fab}
      >
        <Icon name="plus" size={28} color={colors.text} />
      </Pressable>
      <Modal
        visible={!!deleting}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleting(null)}
      >
        <View style={styles.overlay}>
          <View accessibilityViewIsModal style={common.card}>
            <Text style={common.heading}>Usunąć „{deleting?.name}”?</Text>
            <Text style={common.subtitle}>
              Rutyna zniknie z planu. Jej wcześniejsza historia pozostanie
              zapisana.
            </Text>
            <Button
              label="Usuń rutynę"
              tone="danger"
              disabled={saving}
              onPress={() => {
                if (deleting)
                  void remove(deleting.id).then((ok) => {
                    if (ok) setDeleting(null);
                  });
              }}
            />
            <Button label="Anuluj" onPress={() => setDeleting(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  hint: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hintIcon: { color: colors.accentLight, fontSize: 30 },
  emoji: { fontSize: 30 },
  state: { fontSize: 11, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    boxShadow: '0 6px 24px #00000050',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000000bb',
  },
});
