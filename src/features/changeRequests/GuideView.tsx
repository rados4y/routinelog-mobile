import { useCallback, useMemo, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { useKeyboardTop } from '../../components/KeyboardAwareScrollView';
import type { ChangeDraft } from './model';
import { generateChangePrompt } from './model';
import { guideDocument, guideMessageSchema } from './bridge';
import { changeRequestStore } from '../../store/useChangeRequests';
import { colors } from '../../theme';
export function GuideView({ initialDraft }: { initialDraft: ChangeDraft }) {
  const web = useRef<WebView>(null);
  const viewport = useRef<View>(null);
  const [viewportTop, setViewportTop] = useState(0);
  const [failed, setFailed] = useState(false);
  const keyboardTop = useKeyboardTop();
  const [initial] = useState(initialDraft);
  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const source = useMemo(
    () => ({
      html: guideDocument(initial, appVersion, 'native'),
      baseUrl: 'https://routinelog.local/',
    }),
    [appVersion, initial],
  );
  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const parsed = guideMessageSchema.safeParse(
          JSON.parse(event.nativeEvent.data),
        );
        if (!parsed.success) return;
        changeRequestStore.getState().save(parsed.data.draft);
        if (parsed.data.type === 'copy') {
          let success = false;
          try {
            success = await Clipboard.setStringAsync(
              generateChangePrompt(parsed.data.draft, appVersion),
            );
          } catch {
            /* The HTML presents selectable text if copying fails. */
          }
          web.current?.injectJavaScript(
            `window.dispatchEvent(new CustomEvent('guide-copy-result', { detail: { success: ${success} } })); true;`,
          );
        }
      } catch {
        /* Ignore malformed web messages without changing the saved draft. */
      }
    },
    [appVersion],
  );
  return (
    <View
      ref={viewport}
      onLayout={() =>
        viewport.current?.measureInWindow((_x, top) => setViewportTop(top))
      }
      style={
        keyboardTop === undefined
          ? { flex: 1 }
          : { height: Math.max(120, keyboardTop - viewportTop) }
      }
    >
      <WebView
        ref={web}
        startInLoadingState
        renderLoading={() => (
          <ActivityIndicator
            color={colors.accent}
            style={{ position: 'absolute', alignSelf: 'center', top: 30 }}
          />
        )}
        onError={() => setFailed(true)}
        source={source}
        onMessage={(event) => void onMessage(event)}
        style={{ flex: 1, backgroundColor: colors.background }}
        originWhitelist={['https://routinelog.local', 'about:blank']}
        onShouldStartLoadWithRequest={(request) =>
          request.url === 'about:blank' ||
          request.url === 'https://routinelog.local/'
        }
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        domStorageEnabled={false}
        textZoom={100}
      />
      {failed && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            padding: 24,
            gap: 12,
            backgroundColor: colors.background,
          }}
        >
          <Text style={{ color: colors.text }}>Could not open the guide.</Text>
          <Button
            label="Reload guide"
            onPress={() => {
              setFailed(false);
              web.current?.reload();
            }}
          />
        </View>
      )}
    </View>
  );
}
