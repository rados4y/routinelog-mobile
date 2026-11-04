import { Text, StyleSheet } from 'react-native';
import type { OccurrenceStatus } from '../domain/models';
import { colors } from '../theme';

const statusInfo = {
  pending: { text: 'Pending', color: colors.muted },
  done: { text: 'Done', color: colors.success },
  skipped: { text: 'Skipped', color: colors.warning },
  missed: { text: 'Not done', color: colors.danger },
};
export function StatusBadge({
  status,
  overdue = false,
}: {
  status: OccurrenceStatus;
  overdue?: boolean;
}) {
  const info = getStatusInfo(status, overdue);
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
export function getStatusInfo(status: OccurrenceStatus, overdue = false) {
  return overdue
    ? { text: 'Overdue', color: colors.warning }
    : statusInfo[status];
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
