import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { RoutineActionsProvider } from '../src/components/RoutineActionsProvider';
import { AppGate } from '../src/components/AppGate';
import { Button } from '../src/components/Button';
import { colors, common } from '../src/theme';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 32,
        gap: 20,
        backgroundColor: colors.background,
      }}
    >
      <Text style={common.heading}>Something went wrong</Text>
      <Text style={common.subtitle}>
        Your saved data remains on this device.
      </Text>
      <Button label="Try again" onPress={retry} tone="primary" />
    </View>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppGate>
        <RoutineActionsProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="widget-open" options={{ animation: 'none' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="notion" />
            <Stack.Screen
              name="routine-editor"
              options={{ presentation: 'modal' }}
            />
          </Stack>
        </RoutineActionsProvider>
      </AppGate>
    </SafeAreaProvider>
  );
}
