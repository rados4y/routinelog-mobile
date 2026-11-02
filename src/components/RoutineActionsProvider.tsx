import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ChecklistItem, OccurrenceStatus } from '../domain/models';
import { routineForStatusEntry, type EntryMode } from '../domain/entry';
import { nextStatus } from '../domain/status';
import { routineStore, useRoutines } from '../store/useRoutines';
import { Button } from './Button';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { colors, common } from '../theme';

type Prompt = {
  id: string;
  date: string;
  name: string;
  items: ChecklistItem[];
  mode: EntryMode;
};
type Actions = {
  cycleStatus(id: string, date: string, mode?: EntryMode): void;
  requestStatus(
    id: string,
    date: string,
    status: OccurrenceStatus,
    mode?: EntryMode,
  ): void;
};
const Context = createContext<Actions | null>(null);
export function useRoutineActions() {
  const value = useContext(Context);
  if (!value) throw new Error('Brak obsługi akcji rutyny.');
  return value;
}
export function RoutineActionsProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const prompting = useRef(false);
  const close = () => {
    if (routineStore.getState().saving) return;
    prompting.current = false;
    setPrompt(null);
  };
  const requestStatus = (
    id: string,
    date: string,
    status: OccurrenceStatus,
    mode: EntryMode = 'scheduled',
  ) => {
    const state = routineStore.getState();
    if (state.saving || prompting.current) return;
    const original = state.routines.find((item) => item.id === id);
    const hasLog = state.logs.some(
      (item) => item.routineId === id && item.scheduledFor === date,
    );
    const routine =
      original && routineForStatusEntry(original, date, mode, hasLog);
    if (status === 'done' && routine?.checklist?.length) {
      prompting.current = true;
      setPrompt({
        id,
        date,
        name: routine.name,
        mode,
        items: routine.checklist.map((item) => ({ ...item })),
      });
    } else void state.setStatus(id, date, status, undefined, mode);
  };
  const cycleStatus = (
    id: string,
    date: string,
    mode: EntryMode = 'scheduled',
  ) => {
    const log = routineStore
      .getState()
      .logs.find((item) => item.routineId === id && item.scheduledFor === date);
    requestStatus(id, date, nextStatus(log?.status), mode);
  };
  return (
    <Context.Provider value={{ requestStatus, cycleStatus }}>
      {children}
      {prompt && <CompletionSheet prompt={prompt} onClose={close} />}
    </Context.Provider>
  );
}
function CompletionSheet({
  prompt,
  onClose,
}: {
  prompt: Prompt;
  onClose(): void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const saving = useRoutines((state) => state.saving);
  const complete = async () => {
    setError('');
    const ok = await routineStore.getState().setStatus(
      prompt.id,
      prompt.date,
      'done',
      prompt.items.map((item) => ({
        ...item,
        checked: checked.includes(item.id),
      })),
      prompt.mode,
    );
    if (ok) onClose();
    else
      setError(
        routineStore.getState().error ??
          'Nie udało się zapisać. Spróbuj ponownie.',
      );
  };
  return (
    <Sheet
      visible
      title="Lista kroków"
      onClose={onClose}
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label="Potwierdź wykonanie"
            tone="success"
            disabled={saving || checked.length !== prompt.items.length}
            onPress={() => void complete()}
          />
          <Button label="Anuluj" disabled={saving} onPress={onClose} />
        </View>
      }
    >
      <Text style={common.heading}>{prompt.name}</Text>
      <Text style={common.subtitle}>
        Zaznacz wszystkie kroki, aby ukończyć rutynę.
      </Text>
      <Text style={common.small}>
        {checked.length}/{prompt.items.length} kroków
      </Text>
      {prompt.items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="checkbox"
          accessibilityLabel={item.text}
          accessibilityState={{
            checked: checked.includes(item.id),
            disabled: saving,
          }}
          aria-checked={checked.includes(item.id)}
          disabled={saving}
          onPress={() =>
            setChecked((items) =>
              items.includes(item.id)
                ? items.filter((id) => id !== item.id)
                : [...items, item.id],
            )
          }
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 8,
          }}
        >
          <Icon
            name={checked.includes(item.id) ? 'checkCircle' : 'circle'}
            color={checked.includes(item.id) ? colors.success : colors.muted}
          />
          <Text style={[common.text, common.grow]}>{item.text}</Text>
        </Pressable>
      ))}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
    </Sheet>
  );
}
