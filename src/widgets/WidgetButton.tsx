import { useState } from 'react';
import { Text } from 'react-native';
import { ToolButton } from '../components/HabitScreen';
import { Sheet } from '../components/Sheet';
import { colors, common } from '../theme';
import { isWidgetAvailable, pinTodayWidget } from './bridge';

export function WidgetButton() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (busy) return;
    if (!isWidgetAvailable()) {
      setMessage(
        'Home-screen widgets are available in the Android app. Install the latest RoutineLog Android update, then choose Add widget.',
      );
      return;
    }
    setBusy(true);
    try {
      if (!(await pinTodayWidget()))
        setMessage(
          'Long-press an empty area on your Android home screen, choose Widgets, then RoutineLog Today.',
        );
    } catch {
      setMessage(
        'The launcher could not add the widget. Long-press your home screen and choose Widgets → RoutineLog Today.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <ToolButton
        icon="widget"
        label="Add home-screen widget"
        disabled={busy}
        onPress={() => void add()}
      />
      <Sheet
        visible={Boolean(message)}
        title="Today widget"
        onClose={() => setMessage('')}
      >
        <Text style={common.subtitle}>{message}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Tap a routine name to open its details, or its circle to cycle status.
          Tap the daily note to edit it in the app. Checklists open before
          completion.
        </Text>
      </Sheet>
    </>
  );
}
