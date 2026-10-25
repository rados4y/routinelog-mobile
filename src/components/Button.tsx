import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Icon, type IconName } from './Icon';

export function Button({
  label,
  onPress,
  tone = 'default',
  disabled = false,
  icon,
  compact = false,
}: {
  label: string;
  onPress(): void;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  icon?: IconName;
  compact?: boolean;
}) {
  const tint =
    tone === 'default' || tone === 'primary' ? colors.text : colors[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' && styles.primary,
        compact && styles.compact,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon && <Icon name={icon} color={tint} size={18} />}
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.panelSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  compact: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  primary: { backgroundColor: colors.accent },
  label: { fontSize: 13, fontWeight: '700' },
});
