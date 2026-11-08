import { useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { HabitScreen, ToolButton } from '../../components/HabitScreen';
import { Sheet } from '../../components/Sheet';
import { CalendarSheet } from '../../components/CalendarSheet';
import { EmptyState } from '../../components/Screen';
import { NotionButton } from '../../integrations/notion/NotionButton';
import { dateLabel, localDate } from '../../domain/dates';
import { useRoutines } from '../../store/useRoutines';
import { useNoteDrafts } from '../../store/useNoteDrafts';
import { colors, common } from '../../theme';
import { DailyNoteEditor } from './DailyNoteEditor';

export function NotesScreen() {
  const saved = useRoutines((state) => state.notes);
  const drafts = useNoteDrafts((state) => state.drafts);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [calendar, setCalendar] = useState(false);
  const dates = new Set([
    ...saved.map((note) => note.date),
    ...Object.keys(drafts),
  ]);
  const notes = [...dates]
    .map((date) => ({
      date,
      content:
        drafts[date]?.content ??
        saved.find((note) => note.date === date)?.content ??
        '',
    }))
    .filter(
      (note) =>
        (note.content.trim() || drafts[note.date]) &&
        `${note.date} ${dateLabel(note.date)} ${note.content}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <HabitScreen
        title="Notes"
        addRoutine={false}
        tools={
          <>
            <ToolButton
              icon="plus"
              label="Add today's note"
              onPress={() => setEditing(localDate())}
            />
            <ToolButton
              icon="calendar"
              label="Choose note date"
              onPress={() => setCalendar(true)}
            />
            <NotionButton />
          </>
        }
        fixed={
          <TextInput
            accessibilityLabel="Search daily notes"
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes or dates…"
            placeholderTextColor={colors.muted}
            style={styles.search}
          />
        }
      >
        {!notes.length ? (
          <EmptyState
            icon="✎"
            title={search ? 'No matching notes' : 'Your daily notes'}
            description={
              search
                ? 'Try another word or date.'
                : 'Write below your routines on Today, or tap + to add a note.'
            }
          />
        ) : (
          notes.map((note) => (
            <View
              key={note.date}
              testID={`note-entry-${note.date}`}
              style={styles.card}
            >
              <View style={common.spread}>
                <Text
                  accessibilityRole="header"
                  style={[common.heading, { flex: 1 }]}
                >
                  {dateLabel(note.date, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <ToolButton
                  icon="edit"
                  label={`Edit note for ${note.date}`}
                  onPress={() => setEditing(note.date)}
                />
              </View>
              <Text style={common.small}>
                {dateLabel(note.date, { weekday: 'long' })}
              </Text>
              <Text numberOfLines={6} style={styles.preview}>
                {note.content || 'Empty note · changes not yet saved'}
              </Text>
            </View>
          ))
        )}
      </HabitScreen>
      {editing && (
        <Sheet
          visible
          title={dateLabel(editing, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          onClose={() => setEditing(null)}
        >
          <DailyNoteEditor date={editing} />
        </Sheet>
      )}
      {calendar && (
        <CalendarSheet
          visible
          selected={localDate()}
          onClose={() => setCalendar(false)}
          onSelect={(date) => {
            setCalendar(false);
            setEditing(date);
          }}
        />
      )}
    </>
  );
}
const styles = StyleSheet.create({
  search: {
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.panelSecondary,
    borderRadius: 12,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  preview: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 6,
  },
});
