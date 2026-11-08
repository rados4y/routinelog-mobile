import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTodayFocus } from '../store/useTodayFocus';
import { colors } from '../theme';
import { widgetFocusSchema } from './focus';

export function WidgetOpenScreen() {
  const params = useLocalSearchParams();
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const parsed = widgetFocusSchema.safeParse(params);
    if (parsed.success) useTodayFocus.getState().open(parsed.data);
    else useTodayFocus.getState().clear();
    // This route is replaced, so an identical warm deep link can open it again.
    // Viewing a widget target never invokes a status action.
    router.replace('/');
  }, [params]);
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
