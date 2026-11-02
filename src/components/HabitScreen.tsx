import type { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../theme';
import { Icon, type IconName } from './Icon';

export function ToolButton({
  icon,
  label,
  onPress,
  selected = false,
}: {
  icon: IconName;
  label: string;
  onPress(): void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.tool}
    >
      <Icon
        name={icon}
        color={selected ? colors.accentLight : colors.muted}
        size={23}
      />
    </Pressable>
  );
}
export function HabitScreen({
  title,
  tools,
  fixed,
  children,
}: {
  title: string;
  tools?: ReactNode;
  fixed?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.toolbar}>
        <View style={styles.brand}>
          <Icon name="brand" color={colors.accentLight} size={24} />
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
        <View style={styles.tools}>{tools}</View>
      </View>
      {fixed}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dodaj rutynę"
        onPress={() => router.push('/routine-editor')}
        style={styles.fab}
      >
        <Icon name="plus" size={30} color={colors.text} />
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    minHeight: 56,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  tools: { flexDirection: 'row', alignItems: 'center' },
  tool: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 14,
    maxWidth: 660,
    width: '100%',
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    boxShadow: '0 4px 12px #00000030',
  },
});
