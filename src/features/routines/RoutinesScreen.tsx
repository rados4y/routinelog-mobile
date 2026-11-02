import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { HabitScreen, ToolButton } from '../../components/HabitScreen';
import { EmptyState } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { CalendarSheet } from '../../components/CalendarSheet';
import type { Routine } from '../../domain/models';
import { localDate } from '../../domain/dates';
import { useRoutines } from '../../store/useRoutines';
import { common } from '../../theme';
import { NotionButton } from '../../integrations/notion/NotionButton';
import { useNow } from '../../utils/useNow';
import { useRoutineFilter } from './useRoutineFilter';
import { RoutineCard } from './RoutineCard';
import { RoutineInsights } from './RoutineInsights';

export function RoutinesScreen() {
  const today = localDate(useNow());
  const filter = useRoutineFilter();
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const routines = useRoutines((state) => state.routines)
    .filter(
      (routine) =>
        !routine.deletedAt &&
        (!inactiveOnly || !routine.active) &&
        filter.matches(routine),
    )
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const logs = useRoutines((state) => state.logs);
  const saving = useRoutines((state) => state.saving);
  const toggle = useRoutines((state) => state.toggleRoutine);
  const remove = useRoutines((state) => state.deleteRoutine);
  const [options, setOptions] = useState<Routine | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [calendar, setCalendar] = useState<{
    routine: Routine;
    date: string;
  } | null>(null);
  const [insights, setInsights] = useState<Routine | null>(null);
  return (
    <>
      <HabitScreen
        title="Rutyny"
        tools={
          <>
            <ToolButton
              icon="search"
              label="Szukaj rutyn"
              selected={filter.search}
              onPress={filter.toggleSearch}
            />
            <ToolButton
              icon="filter"
              label="Filtruj rutyny"
              selected={filter.filters || filter.activeFilter}
              onPress={filter.toggleFilters}
            />
            <ToolButton
              icon="archive"
              label="Pokaż wyłączone rutyny"
              selected={inactiveOnly}
              onPress={() => setInactiveOnly(!inactiveOnly)}
            />
            <NotionButton />
          </>
        }
        fixed={filter.panel}
      >
        {inactiveOnly && <Text style={common.subtitle}>Wyłączone rutyny</Text>}
        {routines.length ? (
          routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              logs={logs}
              today={today}
              onCalendar={(date) => setCalendar({ routine, date })}
              onInsights={() => setInsights(routine)}
              onOptions={() => {
                setConfirm(false);
                setOptions(routine);
              }}
            />
          ))
        ) : (
          <EmptyState
            title="Brak rutyn"
            description="Zmień filtry lub dodaj nową rutynę przyciskiem +."
          />
        )}
      </HabitScreen>
      <Sheet
        visible={Boolean(options)}
        title={confirm ? 'Usunąć rutynę?' : (options?.name ?? 'Opcje rutyny')}
        onClose={() => setOptions(null)}
      >
        {options &&
          (confirm ? (
            <>
              <Text style={common.subtitle}>
                Rutyna zniknie z planu. Wcześniejsza historia pozostanie
                zapisana.
              </Text>
              <Button
                label="Usuń rutynę"
                tone="danger"
                disabled={saving}
                onPress={() =>
                  void remove(options.id).then((ok) => {
                    if (ok) setOptions(null);
                  })
                }
              />
              <Button
                label="Anuluj usunięcie"
                onPress={() => setConfirm(false)}
              />
            </>
          ) : (
            <>
              <Button
                label="Edytuj"
                icon="edit"
                onPress={() => {
                  setOptions(null);
                  router.push({
                    pathname: '/routine-editor',
                    params: { id: options.id },
                  });
                }}
              />
              <Button
                label={options.active ? 'Wyłącz' : 'Włącz'}
                disabled={saving}
                onPress={() =>
                  void toggle(options.id).then((ok) => {
                    if (ok) setOptions(null);
                  })
                }
              />
              <Button
                label="Usuń"
                tone="danger"
                onPress={() => setConfirm(true)}
              />
              {!!options.note && (
                <Text style={common.subtitle}>{options.note}</Text>
              )}
            </>
          ))}
      </Sheet>
      {calendar && (
        <CalendarSheet
          visible
          routine={calendar.routine}
          selected={calendar.date}
          onClose={() => setCalendar(null)}
        />
      )}
      {insights && (
        <RoutineInsights
          routine={insights}
          logs={logs}
          onClose={() => setInsights(null)}
        />
      )}
    </>
  );
}
