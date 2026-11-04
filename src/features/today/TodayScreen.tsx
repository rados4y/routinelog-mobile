import { useState } from 'react';
import { Text, View } from 'react-native';
import { HabitScreen, ToolButton } from '../../components/HabitScreen';
import { EmptyState } from '../../components/Screen';
import { CalendarSheet } from '../../components/CalendarSheet';
import { localDate } from '../../domain/dates';
import { occurrencesForDate } from '../../domain/schedule';
import { useRoutines } from '../../store/useRoutines';
import { common } from '../../theme';
import { useNow } from '../../utils/useNow';
import { useRoutineFilter } from '../routines/useRoutineFilter';
import { DateSelector } from './DateSelector';
import { OccurrenceCard } from './OccurrenceCard';
import { WidgetButton } from '../../widgets/WidgetButton';
import { NotionButton } from '../../integrations/notion/NotionButton';

export function TodayScreen() {
  const now = useNow();
  const today = localDate(now);
  const [chosenDate, setSelected] = useState<string | null>(null);
  const selected = chosenDate ?? today;
  const [calendar, setCalendar] = useState(false);
  const filter = useRoutineFilter();
  const routines = useRoutines((state) => state.routines);
  const logs = useRoutines((state) => state.logs);
  const occurrences = occurrencesForDate(routines, logs, selected, now).filter(
    (item) => filter.matches(item.routine),
  );
  return (
    <>
      <HabitScreen
        title="Today"
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
              icon="calendar"
              label="Choose date"
              onPress={() => setCalendar(true)}
            />
            <WidgetButton />
            <NotionButton />
          </>
        }
        fixed={
          <>
            {filter.panel}
            <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
              <DateSelector
                today={today}
                selected={selected}
                onSelect={(value) =>
                  setSelected(value === today ? null : value)
                }
              />
            </View>
          </>
        }
      >
        {selected > today && (
          <Text style={common.small}>Future plan preview</Text>
        )}
        {occurrences.length ? (
          <View>
            {occurrences.map((occurrence) => (
              <OccurrenceCard
                key={occurrence.routine.id}
                occurrence={occurrence}
                future={selected > today}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="✓"
            title="No routines for this day"
            description="Tap + to add a routine, or change the date and filters."
          />
        )}
      </HabitScreen>
      {calendar && (
        <CalendarSheet
          visible
          onClose={() => setCalendar(false)}
          selected={selected}
          onSelect={(value) => setSelected(value === today ? null : value)}
        />
      )}
    </>
  );
}
