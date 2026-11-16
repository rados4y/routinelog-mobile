import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ToolButton } from '../../components/HabitScreen';
import { colors, common } from '../../theme';

export function DailySection({
  title,
  count,
  addLabel,
  onAdd,
  children,
  disabled = false,
}: {
  title: string;
  count?: string;
  addLabel: string;
  onAdd(): void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <View style={dailyStyles.section}>
      <View style={dailyStyles.heading}>
        <Text accessibilityRole="header" style={dailyStyles.title}>
          {title}
        </Text>
        <Text style={common.small}>{count}</Text>
        <ToolButton
          icon="plus"
          label={addLabel}
          onPress={onAdd}
          disabled={disabled}
          selected
        />
      </View>
      {children}
    </View>
  );
}
export const dailyStyles = StyleSheet.create({
  section: {
    backgroundColor: colors.panel,
    borderRadius: 17,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingBottom: 2,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 8,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    minHeight: 44,
  },
  name: { color: colors.text, fontSize: 13, lineHeight: 18, flex: 1 },
  details: {
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
});
