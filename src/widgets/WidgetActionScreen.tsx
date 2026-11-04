import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRoutineActions } from '../components/RoutineActionsProvider';
import { routineStore } from '../store/useRoutines';
import { localDate } from '../domain/dates';
import { occurrencesForDate } from '../domain/schedule';
import { widgetClickSchema } from './model';
import { colors } from '../theme';

// A deep link only opens a confirmation sheet. It never completes a routine by itself.
export function WidgetActionScreen() {
  const params = useLocalSearchParams();
  const handled = useRef(false);
  const { requestStatus } = useRoutineActions();
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const parsed = widgetClickSchema.safeParse(params);
    const state = routineStore.getState();
    const today = localDate();
    if (parsed.success && parsed.data.date === today) {
      const occurrence = occurrencesForDate(
        state.routines,
        state.logs,
        today,
      ).find((item) => item.routine.id === parsed.data.routineId);
      if (
        occurrence?.routine.checklist?.length &&
        (occurrence.log?.status ?? 'pending') === parsed.data.expectedStatus &&
        parsed.data.expectedStatus === 'pending'
      ) {
        requestStatus(occurrence.routine.id, today, 'done');
      }
    }
    router.replace('/');
  }, [params, requestStatus]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
