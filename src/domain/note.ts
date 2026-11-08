import { z } from 'zod';
import { dateSchema } from './models';

export const maxNoteLength = 20_000;
export const dailyNoteSchema = z
  .object({
    id: dateSchema,
    date: dateSchema,
    content: z.string().max(maxNoteLength),
    source: z.enum(['app', 'notion']),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .refine(
    (note) => note.id === note.date,
    'A daily note must belong to its date.',
  );
export type DailyNote = z.infer<typeof dailyNoteSchema>;

export function datesWithNotes(
  notes: readonly Pick<DailyNote, 'date' | 'content'>[],
  drafts: Readonly<Record<string, { readonly content: string }>> = {},
): Set<string> {
  const content = new Map(notes.map((note) => [note.date, note.content]));
  for (const [date, draft] of Object.entries(drafts))
    content.set(date, draft.content);
  return new Set(
    [...content]
      .filter(([, text]) => text.trim().length > 0)
      .map(([date]) => date),
  );
}

// Empty content is a durable tombstone so clearing a note also clears Notion.
export function createDailyNote(
  date: string,
  content: string,
  previous?: DailyNote,
  now = new Date(),
  source: DailyNote['source'] = 'app',
): DailyNote {
  const normalized = content.replace(/\r\n?/g, '\n');
  return dailyNoteSchema.parse({
    id: date,
    date,
    content: normalized.trim() ? normalized : '',
    source,
    createdAt: previous?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  });
}
