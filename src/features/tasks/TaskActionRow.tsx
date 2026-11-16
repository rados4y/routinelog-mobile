import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { colors } from '../../theme';

export interface TaskEditorAction {
  label: string;
  caption?: string;
  icon?: IconName;
  tone?: 'primary' | 'danger';
  disabled?: boolean;
  onPress(): void;
}

export function TaskActionRow({ actions }: { actions: TaskEditorAction[] }) {
  return (
    <View testID="task-editor-actions" style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: Boolean(action.disabled) }}
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.button,
            action.caption ? styles.captionButton : styles.iconButton,
            action.tone === 'primary' && styles.primary,
            { opacity: action.disabled ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          {action.icon && (
            <Icon
              name={action.icon}
              size={17}
              color={action.tone === 'danger' ? colors.danger : colors.text}
            />
          )}
          {action.caption && (
            <Text numberOfLines={1} style={styles.caption}>
              {action.caption}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  button: {
    height: 44,
    minWidth: 44,
    borderRadius: 10,
    backgroundColor: colors.panelSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
  },
  captionButton: { flex: 1 },
  iconButton: { width: 44 },
  primary: { backgroundColor: colors.accent },
  caption: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
