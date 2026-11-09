import { useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { colors, common } from '../../theme';
import { useChangeRequests } from '../../store/useChangeRequests';
import { GuideView } from './GuideView';
export function RequestChangesScreen() {
  const state = useChangeRequests();
  const load = state.load;
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View
        style={[
          common.spread,
          { padding: 12, borderBottomWidth: 1, borderColor: colors.border },
        ]}
      >
        <Text accessibilityRole="header" style={common.heading}>
          Request changes
        </Text>
        <Button
          label="Back"
          compact
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/settings')
          }
        />
      </View>
      {!!state.error && (
        <View style={{ padding: 12, gap: 8 }}>
          <Text
            accessibilityRole="alert"
            style={[common.small, { color: colors.warning }]}
          >
            {state.error}
          </Text>
          <Button label="Retry draft save" compact onPress={state.retry} />
        </View>
      )}
      {state.ready ? (
        <GuideView initialDraft={state.draft} />
      ) : state.loading ? (
        <ActivityIndicator style={{ margin: 30 }} color={colors.accent} />
      ) : null}
    </SafeAreaView>
  );
}
