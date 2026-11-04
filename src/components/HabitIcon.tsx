import { Text, View, StyleSheet } from 'react-native';
import type { RoutineInput } from '../domain/models';
import { Icon, type IconName } from './Icon';

import { categoryColors } from '../theme/colors';
export { categoryColors } from '../theme/colors';
export function HabitIcon({
  routine,
  small = false,
}: {
  routine: Pick<RoutineInput, 'icon' | 'category'>;
  small?: boolean;
}) {
  const glyph: IconName | undefined =
    routine.icon === '🎓' || routine.icon === '📚'
      ? 'graduation'
      : routine.icon === '💬' || routine.icon === '☎️'
        ? 'chat'
        : routine.icon === '🥾'
          ? 'mountain'
          : undefined;
  return (
    <View
      style={[
        styles.icon,
        small && styles.small,
        { backgroundColor: categoryColors[routine.category] },
      ]}
    >
      {glyph ? (
        <Icon name={glyph} color="#15231f" size={small ? 23 : 26} />
      ) : (
        <Text style={{ fontSize: small ? 21 : 24 }}>{routine.icon}</Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { width: 36, height: 36, borderRadius: 10 },
});
