import { describe, expect, it, vi } from 'vitest';
import {
  createDailyNote,
  dailyNoteSchema,
  datesWithNotes,
  maxNoteLength,
} from './note';
import { repositories } from '../data/repositories';
import { MemoryStorage } from '../test/fixtures';
import { createRoutineStore } from '../store/createRoutineStore';
import { createNoteDraftStore } from '../store/createNoteDraftStore';

const date = '2026-11-08';
const now = () => new Date('2026-11-08T12:00:00Z');
describe('daily notes and durable editing', () => {
  it('marks only dates with content, with local drafts overriding saved or synchronized notes', () => {
    const notes = [
      { date, content: 'From Notion' },
      { date: '2026-11-09', content: '' },
      { date: '2026-11-10', content: ' \n ' },
    ];
    expect([...datesWithNotes(notes)]).toEqual([date]);
    const drafts = {
      [date]: { content: '  ' },
      '2026-11-09': { content: 'Unsaved note, including failed saves' },
      '2026-12-01': { content: 'A future note' },
    };
    expect([...datesWithNotes(notes, drafts)]).toEqual([
      '2026-11-09',
      '2026-12-01',
    ]);
    expect(notes[0]?.content).toBe('From Notion');
  });
  it('normalizes newlines, preserves whitespace inside a note and validates its identity and size', () => {
    const note = createDailyNote(date, ' A\r\nB 💛 ', undefined, now());
    expect(note.content).toBe(' A\nB 💛 ');
    expect(createDailyNote(date, '  \n ', note, now()).content).toBe('');
    expect(
      dailyNoteSchema.safeParse({ ...note, id: '2026-11-07' }).success,
    ).toBe(false);
    expect(() => createDailyNote('invalid', 'text')).toThrow();
    expect(() =>
      createDailyNote(date, 'x'.repeat(maxNoteLength + 1)),
    ).toThrow();
  });
  it('serializes rapid saves, isolates dates and persists cleared-note tombstones across restarts', async () => {
    const storage = new MemoryStorage();
    const repos = repositories(storage);
    const store = createRoutineStore(repos, now);
    await store.getState().load();
    const count = store.getState().routines.length;
    expect(
      await Promise.all([
        store.getState().saveNote(date, 'first'),
        store.getState().saveNote(date, 'latest'),
        store.getState().saveNote('2026-12-01', 'Plan'),
      ]),
    ).toEqual([true, true, true]);
    expect(
      store.getState().notes.find((note) => note.date === date)?.content,
    ).toBe('latest');
    const snapshot = store.getState().notes.find((note) => note.date === date)!;
    await store.getState().saveNote(date, '');
    expect(
      await store
        .getState()
        .applySyncedNote(snapshot, { ...snapshot, content: 'stale remote' }),
    ).toBe(false);
    const reload = createRoutineStore(repositories(storage), now);
    await reload.getState().load();
    expect(
      reload.getState().notes.find((note) => note.date === date)?.content,
    ).toBe('');
    expect(
      reload.getState().notes.find((note) => note.date === '2026-12-01')
        ?.content,
    ).toBe('Plan');
    expect(reload.getState().routines).toHaveLength(count);
    expect(reload.getState().logs).toEqual([]);
  });
  it('keeps a failed draft available and retries without losing newer edits or another date', async () => {
    let resolveFirst!: (value: boolean) => void;
    const write = vi
      .fn<(date: string, content: string) => Promise<boolean>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const drafts = createNoteDraftStore(write);
    drafts.getState().edit(date, 'old');
    const first = drafts.getState().save(date);
    await Promise.resolve();
    drafts.getState().edit(date, 'new');
    drafts.getState().edit('2026-11-09', 'other date');
    resolveFirst(true);
    await first;
    expect(drafts.getState().drafts[date]?.content).toBe('new');
    expect(await drafts.getState().save(date)).toBe(false);
    expect(drafts.getState().errors[date]).toContain('Could not save');
    expect(drafts.getState().drafts[date]?.content).toBe('new');
    expect(await drafts.getState().flush()).toBe(true);
    expect(drafts.getState().drafts).toEqual({});
    expect(write).toHaveBeenCalledWith(date, 'new');
    expect(write).toHaveBeenCalledWith('2026-11-09', 'other date');
  });
  it('reports a repository write failure without claiming a new note was saved', async () => {
    const repos = repositories(new MemoryStorage());
    const store = createRoutineStore(repos, now);
    await store.getState().load();
    vi.spyOn(repos.notes, 'save').mockRejectedValueOnce(new Error('Disk full'));
    expect(await store.getState().saveNote(date, 'keep draft')).toBe(false);
    expect(store.getState().notes).toEqual([]);
    expect(await repos.notes.list()).toEqual([]);
  });
});
