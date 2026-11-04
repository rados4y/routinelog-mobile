import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { HabitScreen, ToolButton } from '../../components/HabitScreen';
import { EmptyState } from '../../components/Screen';
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
  const [calendar, setCalendar] = useState<{
    routine: Routine;
    date: string;
  } | null>(null);
  const [insights, setInsights] = useState<Routine | null>(null);
  return (
    <>
      <HabitScreen
        title="Routines"
        tools={
          <>
            <ToolButton
              icon="search"
              label="Search routines"
              selected={filter.search}
              onPress={filter.toggleSearch}
            />
            <ToolButton
              icon="filter"
              label="Filter routines"
              selected={filter.filters || filter.activeFilter}
              onPress={filter.toggleFilters}
            />
            <ToolButton
              icon="archive"
              label="Show paused routines"
              selected={inactiveOnly}
              onPress={() => setInactiveOnly(!inactiveOnly)}
            />
            <NotionButton />
          </>
        }
        fixed={filter.panel}
      >
        {inactiveOnly && <Text style={common.subtitle}>Paused routines</Text>}
        {routines.length ? (
          routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              logs={logs}
              today={today}
              onCalendar={(date) => setCalendar({ routine, date })}
              onInsights={() => setInsights(routine)}
              onEdit={() =>
                router.push({
                  pathname: '/routine-editor',
                  params: { id: routine.id },
                })
              }
            />
          ))
        ) : (
          <EmptyState
            title="No routines"
            description="Change filters or tap + to add a routine."
          />
        )}
      </HabitScreen>
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
