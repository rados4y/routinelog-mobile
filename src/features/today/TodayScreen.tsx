import { useEffect, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
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
import { DailyNoteEditor } from '../notes/DailyNoteEditor';
import { useDayHighlights } from './useDayHighlights';
import { DailySection } from './DailySection';
import { router } from 'expo-router';
import { useTodayFocus } from '../../store/useTodayFocus';
import { TaskSection } from '../tasks/TaskSection';
import { DayMarkerLegend } from '../../components/DayMarkers';

export function TodayScreen() {
  const now = useNow();
  const today = localDate(now);
  const [chosenDate, setSelected] = useState<string | null>(null);
  const target = useTodayFocus((state) => state.target);
  const request = useTodayFocus((state) => state.request);
  const focus = target ? { ...target, request } : null;
  const selected = target?.date ?? chosenDate ?? today;
  const [calendar, setCalendar] = useState(false);
  const filter = useRoutineFilter();
  const resetFilter = filter.reset;
  useEffect(() => {
    if (!target) return;
    resetFilter();
    if (target.focus === 'routine') Keyboard.dismiss();
  }, [target, request, resetFilter]);
  const selectDate = (date: string) => {
    useTodayFocus.getState().clear();
    setSelected(date === today ? null : date);
  };
  const routines = useRoutines((state) => state.routines);
  const logs = useRoutines((state) => state.logs);
  const highlights = useDayHighlights(today);
  const planned = occurrencesForDate(routines, logs, selected, now);
  const occurrences = planned.filter((item) => filter.matches(item.routine));
  return (
    <>
      <HabitScreen
        title="Today"
        dense
        addRoutine={false}
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
            <View style={{ paddingHorizontal: 10, paddingBottom: 0 }}>
              <DateSelector
                today={today}
                selected={selected}
                {...highlights}
                onSelect={selectDate}
              />
              <DayMarkerLegend />
            </View>
          </>
        }
      >
        {focus?.focus === 'routine' &&
          focus.date === selected &&
          !planned.some((item) => item.routine.id === focus.routineId) && (
            <Text accessibilityRole="alert" style={common.small}>
              That routine is no longer scheduled for this date. Open Routines
              to review it.
            </Text>
          )}
        {selected > today && (
          <Text style={common.small}>Future plan preview</Text>
        )}
        <DailySection
          title="Routines"
          count={`${occurrences.filter((item) => item.status === 'done').length}/${occurrences.length}`}
          addLabel="Add routine"
          onAdd={() => router.push('/routine-editor')}
          disabled={selected < today}
        >
          {occurrences.length ? (
            <View>
              {occurrences.map((occurrence) => (
                <OccurrenceCard
                  key={occurrence.routine.id}
                  occurrence={occurrence}
                  future={selected > today}
                  focusRequest={
                    focus?.focus === 'routine' &&
                    focus.date === selected &&
                    focus.routineId === occurrence.routine.id
                      ? focus.request
                      : undefined
                  }
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="✓"
              title="No routines for this day"
              description="Add recurring routines on the Routines page, or change the date and filters."
            />
          )}
        </DailySection>
        <TaskSection
          key={`tasks-${selected}-${focus && (focus.focus === 'task' || focus.focus === 'new-task') ? focus.request : 'none'}`}
          date={selected}
          today={today}
          openRequest={
            focus &&
            (focus.focus === 'task' || focus.focus === 'new-task') &&
            focus.date === selected
              ? focus.request
              : undefined
          }
          taskId={focus?.focus === 'task' ? focus.taskId : undefined}
        />
        <DailyNoteEditor
          key={selected}
          collapsible
          date={selected}
          focusRequest={
            focus?.focus === 'note' && focus.date === selected
              ? focus.request
              : undefined
          }
        />
      </HabitScreen>
      {calendar && (
        <CalendarSheet
          visible
          onClose={() => setCalendar(false)}
          selected={selected}
          onSelect={selectDate}
        />
      )}
    </>
  );
}
