import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { colors, common } from '../../theme';
import { supportsNotionConnection } from './credentials';
import { notionPageUrl, useNotion } from './useNotion';

export function NotionSyncScreen() {
  const [token, setToken] = useState('');
  const state = useNotion();
  const connect = async () => {
    if (await state.connect(token)) {
      setToken('');
      await state.sync();
    }
  };
  return (
    <Screen
      title="Notion"
      subtitle="Your routines and daily notes, on your phone and in monthly tables"
      action={<Button label="Back" compact onPress={() => router.back()} />}
    >
      <View style={common.card}>
        <Text style={common.heading}>One month, one table</Text>
        <Text style={common.subtitle}>
          Days are rows and routines are columns. Add, rename or remove a column
          in the current month to update the app. Changes on your phone sync
          back to Notion.
        </Text>
        <Text style={common.subtitle}>
          The Notes text column holds one daily note per row. Notes sync both
          ways, including cleared text. Keep this column as Text; renaming it is
          supported. Conflicting edits ask which version to keep.
        </Text>
        <Button
          label="Open RoutineLog in Notion"
          onPress={() => void Linking.openURL(notionPageUrl)}
        />
      </View>
      <View style={common.card}>
        <Text style={common.heading}>
          {state.connected ? 'Connected to Notion' : 'Connect your account'}
        </Text>
        {!supportsNotionConnection && (
          <Text style={common.subtitle}>
            Connect using the Android app or Expo Go. The browser preview does
            not store tokens.
          </Text>
        )}
        {state.connected ? (
          <>
            <Text style={common.subtitle}>
              {state.lastSuccess
                ? `Last synced: ${new Date(state.lastSuccess).toLocaleString('en-GB')}`
                : 'The first sync has not completed yet.'}
            </Text>
            <Button
              label="Sync now"
              tone="primary"
              disabled={state.busy}
              onPress={() => void state.sync()}
            />
            <Button
              label="Disconnect Notion"
              disabled={state.busy}
              onPress={() => void state.disconnect()}
            />
          </>
        ) : (
          <>
            <Text style={common.subtitle}>
              Create a personal token with Notion API access for the account
              that owns RoutineLog. Paste it only here. It is saved in your
              phone’s secure storage.
            </Text>
            <Button
              label="Create a Notion token"
              onPress={() =>
                void Linking.openURL('https://www.notion.so/developers/tokens')
              }
            />
            {supportsNotionConnection && (
              <>
                <Text style={common.label}>Personal Notion token</Text>
                <TextInput
                  accessibilityLabel="Personal Notion token"
                  style={common.field}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={token}
                  onChangeText={setToken}
                  placeholder="Paste token"
                  placeholderTextColor={colors.muted}
                />
                <Button
                  label="Connect and sync"
                  tone="primary"
                  disabled={state.busy || token.trim().length < 10}
                  onPress={() => void connect()}
                />
              </>
            )}
          </>
        )}
        {state.busy && (
          <View style={common.row}>
            <ActivityIndicator color={colors.accent} />
            <Text style={common.small}>
              Syncing… You can return to your routines.
            </Text>
          </View>
        )}
        {!!state.error && (
          <Text
            accessibilityRole="alert"
            style={[common.text, { color: colors.warning }]}
          >
            {state.error}
          </Text>
        )}
        {state.conflict && (
          <>
            <Text style={common.subtitle}>
              Choose which conflicting changes to keep. Other changes will be
              merged.
            </Text>
            <Button
              label="Keep app version"
              disabled={state.busy}
              onPress={() => void state.sync('app')}
            />
            <Button
              label="Keep Notion version"
              disabled={state.busy}
              onPress={() => void state.sync('notion')}
            />
          </>
        )}
      </View>
      <View style={common.card}>
        <Text style={common.heading}>How sync works</Text>
        <Text style={common.subtitle}>
          Sync runs when you open the app, after saved changes, and every minute
          while the app is open. Offline changes stay on your device. Sync does
          not run in the system background.
        </Text>
        <Text style={common.subtitle}>
          Routine settings are in the column description. Existing Notion fields
          and status names stay compatible: Kategoria, Godzina, Plan, Aktywna;
          Wykonane (done), Pominięte (skipped), Niewykonane (not done). A new
          column defaults to a daily routine.
        </Text>
        <Text style={common.subtitle}>
          Select columns support all statuses; clearing a cell undoes its
          status. Checkbox columns support done and unchecked. Other statuses
          remain in the app.
        </Text>
        <Text style={common.subtitle}>
          Previous months keep their columns. Archived status changes still
          sync. Removing a column in the current month removes the routine from
          your plan while keeping its history.
        </Text>
        <Text style={common.small}>
          Notion can restore routine settings and statuses on a new phone. Exact
          completion times, checklist confirmations, log notes, values and
          historical schedule versions remain local. Imported completion times
          refer to the last edit of the Notion row.
        </Text>
      </View>
    </Screen>
  );
}
