import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useRoutines } from '../store/useRoutines';
import { colors, common } from '../theme';
import { Button } from './Button';
import { AutoSync } from '../integrations/notion/AutoSync';

export function AppGate({ children }: { children: ReactNode }) {
  const ready = useRoutines((s) => s.ready);
  const error = useRoutines((s) => s.error);
  const loading = useRoutines((s) => s.loading);
  const load = useRoutines((s) => s.load);
  const clearError = useRoutines((s) => s.clearError);
  useEffect(() => {
    void load();
  }, [load]);
  if (!ready)
    return (
      <View style={styles.center}>
        {loading ? (
          <>
            <ActivityIndicator color={colors.accentLight} size="large" />
            <Text style={common.subtitle}>Loading your routines…</Text>
          </>
        ) : (
          <>
            <Text accessibilityRole="alert" style={common.text}>
              {error ?? 'Loading…'}
            </Text>
            <Button label="Try again" onPress={() => void load()} />
          </>
        )}
      </View>
    );
  return (
    <View style={styles.root}>
      <AutoSync />
      {children}
      {error && (
        <View style={styles.error}>
          <Text
            accessibilityRole="alert"
            style={[common.small, { color: colors.text }]}
          >
            {error}
          </Text>
          <Button label="Dismiss message" onPress={clearError} compact />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  error: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: colors.panelSecondary,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: 16,
    borderRadius: 16,
    gap: 10,
    zIndex: 100,
  },
});
