import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import {
  useRevealInput,
  useRevealSection,
} from '../../components/KeyboardAwareScrollView';
import { Button } from '../../components/Button';
import { dateLabel } from '../../domain/dates';
import { maxNoteLength } from '../../domain/note';
import { useRoutines } from '../../store/useRoutines';
import { useNoteDrafts } from '../../store/useNoteDrafts';
import { colors, common } from '../../theme';

export function DailyNoteEditor({
  date,
  focusRequest,
}: {
  date: string;
  focusRequest?: number;
}) {
  const input = useRef<TextInput>(null);
  const card = useRef<View>(null);
  const focusedRequest = useRef<number | undefined>(undefined);
  const revealSection = useRevealSection();
  const reveal = useRevealInput();
  const note = useRoutines((state) =>
    state.notes.find((item) => item.date === date),
  );
  const draft = useNoteDrafts((state) => state.drafts[date]);
  const error = useNoteDrafts((state) => state.errors[date]);
  const saving = useNoteDrafts((state) => state.saving[date]);
  const edit = useNoteDrafts((state) => state.edit);
  const save = useNoteDrafts((state) => state.save);
  const value = draft?.content ?? note?.content ?? '';
  useFocusEffect(
    useCallback(() => {
      if (!focusRequest || focusedRequest.current === focusRequest) return;
      let cancelled = false;
      let retry: ReturnType<typeof setTimeout> | undefined;
      let attempts = 0;
      const activate = () => {
        if (cancelled) return;
        revealSection(card.current, () => {
          if (cancelled) return;
          input.current?.focus();
          retry = setTimeout(() => {
            if (cancelled) return;
            if (input.current?.isFocused())
              focusedRequest.current = focusRequest;
            else if (++attempts < 6) activate();
          }, 150);
        });
      };
      const frame = requestAnimationFrame(() => {
        // Back can hide Android's IME without clearing focus. Reset it once;
        // retries cover native screen activation, without refocusing while typing.
        input.current?.blur();
        activate();
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        clearTimeout(retry);
      };
    }, [focusRequest, revealSection]),
  );
  return (
    <View ref={card} style={styles.card} testID={`daily-note-${date}`}>
      <View style={common.spread}>
        <Text accessibilityRole="header" style={common.heading}>
          Daily note
        </Text>
        <Text accessibilityLiveRegion="polite" style={common.small}>
          {error
            ? 'Not saved'
            : draft || saving
              ? 'Saving…'
              : note
                ? 'Saved on device'
                : 'Autosaves on device'}
        </Text>
      </View>
      <Text style={common.small}>{dateLabel(date)}</Text>
      <TextInput
        ref={input}
        accessibilityLabel={`Daily note for ${date}`}
        multiline
        maxLength={maxNoteLength}
        value={value}
        onChangeText={(content) => edit(date, content)}
        onFocus={() => reveal(input.current)}
        onSelectionChange={() => reveal(input.current)}
        onContentSizeChange={() => reveal(input.current)}
        onBlur={() => {
          reveal(null);
          void save(date);
        }}
        placeholder="Write about your day…"
        placeholderTextColor={colors.muted}
        textAlignVertical="top"
        style={styles.input}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
      {(draft || error) && (
        <Button
          compact
          label={error ? 'Retry saving note' : 'Save note now'}
          onPress={() => void save(date)}
          disabled={Boolean(saving)}
        />
      )}
      {value.length > maxNoteLength - 1000 && (
        <Text style={common.small}>
          {value.length.toLocaleString()} / {maxNoteLength.toLocaleString()}{' '}
          characters
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  input: {
    minHeight: 120,
    maxHeight: 180,
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    padding: 10,
    backgroundColor: colors.panelSecondary,
    borderRadius: 12,
    borderColor: colors.border,
    borderWidth: 1,
  },
});
