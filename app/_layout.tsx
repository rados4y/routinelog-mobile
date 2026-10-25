import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
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
      <Text style={common.heading}>Coś poszło nie tak</Text>
      <Text style={common.subtitle}>
        Twoje zapisane dane pozostają na urządzeniu.
      </Text>
      <Button label="Spróbuj ponownie" onPress={retry} tone="primary" />
    </View>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="routine-editor"
            options={{ presentation: 'modal' }}
          />
        </Stack>
      </AppGate>
    </SafeAreaProvider>
  );
}
