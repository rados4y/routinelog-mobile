import type { ReactNode } from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, common } from '../theme';

export function Screen({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={common.spread}>
          <View style={common.grow}>
            <Text accessibilityRole="header" style={common.title}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[common.subtitle, styles.subtitle]}>{subtitle}</Text>
            )}
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function EmptyState({
  icon = '✦',
  title,
  description,
}: {
  icon?: string;
  title: string;
  description: string;
}) {
  return (
    <View style={[common.card, styles.empty]}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={common.heading}>{title}</Text>
      <Text style={[common.subtitle, styles.center]}>{description}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 24,
    paddingBottom: 110,
    gap: 28,
    width: '100%',
    maxWidth: 660,
    alignSelf: 'center',
  },
  subtitle: { marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 36 },
  emptyIcon: { fontSize: 32, color: colors.accentLight },
  center: { textAlign: 'center' },
});
