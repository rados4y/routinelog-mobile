import { Text, StyleSheet } from 'react-native';
import type { OccurrenceStatus } from '../domain/models';
import { colors } from '../theme';

const statusInfo = {
  pending: { text: 'Do zrobienia', color: colors.muted },
  done: { text: 'Wykonane', color: colors.success },
  skipped: { text: 'Pominięte', color: colors.warning },
  missed: { text: 'Niewykonane', color: colors.danger },
};
export function StatusBadge({
  status,
  overdue = false,
}: {
  status: OccurrenceStatus;
  overdue?: boolean;
}) {
  const info = overdue
    ? { text: 'Po czasie', color: colors.warning }
    : statusInfo[status];
  return (
    <Text
      style={[
        styles.badge,
        { color: info.color, backgroundColor: `${info.color}18` },
      ]}
    >
      {info.text}
    </Text>
  );
}
const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
