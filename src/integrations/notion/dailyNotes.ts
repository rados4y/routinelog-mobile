import { createDailyNote, maxNoteLength } from '../../domain/note';
import {
  mergeValue,
  type Column,
  type ConflictChoice,
  type MonthLedger,
  type MonthTable,
  type NotionGateway,
  type SyncLocal,
} from './models';

export const notesColumnMarker = 'RoutineLog daily notes (v1)';
export const isNotesColumn = (column: Column) =>
  column.description.startsWith(notesColumnMarker);

export function noteWrite(content: string): {
  rich_text: { type: 'text'; text: { content: string } }[];
} {
  if (content.length > maxNoteLength)
    throw new Error(
      `Daily notes support up to ${maxNoteLength.toLocaleString()} characters. The full note remains saved.`,
    );
  const rich_text: { type: 'text'; text: { content: string } }[] = [];
  let part = '';
  for (const character of content) {
    if (part.length + character.length > 1800) {
      rich_text.push({ type: 'text', text: { content: part } });
      part = '';
    }
    part += character;
  }
  if (part) rich_text.push({ type: 'text', text: { content: part } });
  return { rich_text };
}
export async function ensureNotesColumn(
  table: MonthTable,
  ledger: MonthLedger,
  remote: NotionGateway,
  persist: () => Promise<void>,
): Promise<MonthTable> {
  let columns = table.columns.filter(
    (column) => column.id === ledger.notesPropertyId || isNotesColumn(column),
  );
  if (columns.length > 1)
    throw new Error(
      `The ${table.month} table has duplicate daily-notes columns. Keep one to avoid ambiguous sync.`,
    );
  let column = columns[0];
  if (!column) {
    let name = 'Notes';
    let suffix = 1;
    while (table.columns.some((item) => item.name === name))
      name = suffix++ === 1 ? 'Daily notes' : `Daily notes ${suffix}`;
    table = await remote.updateColumns(table, {
      [name]: {
        description: `${notesColumnMarker}\nOne note per day. Edit here or in RoutineLog.`,
        rich_text: {},
      },
    });
    columns = table.columns.filter(isNotesColumn);
    column = columns[0];
    if (columns.length !== 1 || !column)
      throw new Error('Could not link the daily-notes column. Try again.');
  }
  if (column.type !== 'rich_text')
    throw new Error(
      'The daily-notes column must be a Text property. Restore its type before syncing.',
    );
  if (!isNotesColumn(column))
    table = await remote.updateColumns(table, {
      [column.id]: {
        description: `${notesColumnMarker}\n${column.description}`,
      },
    });
  if (ledger.notesPropertyId !== column.id) {
    ledger.notesPropertyId = column.id;
    // A recreated column is empty by construction, not an instruction to erase notes.
    ledger.notes = {};
    await persist();
  }
  return { ...table, notesPropertyId: column.id };
}
export async function syncDailyNotes(
  table: MonthTable,
  ledger: MonthLedger,
  remote: NotionGateway,
  local: SyncLocal,
  persist: () => Promise<void>,
  clock: () => Date,
  choice?: ConflictChoice,
): Promise<void> {
  const column = table.columns.find(
    (item) => item.id === ledger.notesPropertyId,
  );
  if (!column || column.type !== 'rich_text')
    throw new Error('The daily-notes column is unavailable. Sync again.');
  for (const row of table.rows) {
    const existing = local.read().notes.find((note) => note.date === row.date);
    const localText = existing?.content ?? '';
    const remoteText = row.note ?? '';
    if (remoteText.length > maxNoteLength)
      throw new Error(
        `The daily note for ${row.date} exceeds ${maxNoteLength.toLocaleString()} characters. Shorten it in Notion before syncing; it has not been overwritten.`,
      );
    const base = ledger.notes[row.date];
    const initial =
      base === undefined && (!remoteText || (!localText && !existing));
    const merged = initial
      ? localText || remoteText
      : mergeValue(
          base === undefined ? undefined : { content: base },
          { content: localText },
          { content: remoteText },
          `Daily note · ${row.date}`,
          choice,
        ).content;
    if (merged !== remoteText)
      await remote.writeCells(row.id, { [column.id]: noteWrite(merged) });
    if (
      merged !== localText &&
      !(await local.applyNote(
        existing,
        createDailyNote(row.date, merged, existing, clock(), 'notion'),
      ))
    )
      throw new Error(
        'A daily note changed while syncing. Your newer text has been kept. Sync again.',
      );
    // A successful remote write becomes the base even if the app has since saved
    // newer text. On the next pass that newer text remains a local-only change.
    if (ledger.notes[row.date] !== merged) {
      ledger.notes[row.date] = merged;
      await persist();
    }
  }
}
