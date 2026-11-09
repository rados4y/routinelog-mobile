import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { common } from '../../theme';
export function SettingsScreen() {
  return (
    <Screen
      title="Settings"
      compact
      subtitle="RoutineLog tools and configuration"
      action={
        <Button
          label="Back"
          compact
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
        />
      }
    >
      <View style={common.card}>
        <Text style={common.heading}>Make RoutineLog yours</Text>
        <Text style={common.small}>
          Explore screens and their logic, collect changes and prepare a request
          to paste into ChatGPT.
        </Text>
        <Button
          label="Request changes"
          icon="edit"
          tone="primary"
          onPress={() => router.push('/request-changes')}
        />
      </View>
      <View style={common.card}>
        <Text style={common.heading}>Integrations</Text>
        <Button
          label="Notion sync"
          icon="chain"
          onPress={() => router.push('/notion')}
        />
      </View>
      <Text style={common.small}>
        RoutineLog {Constants.expoConfig?.version ?? ''}{' '}
      </Text>
    </Screen>
  );
}
