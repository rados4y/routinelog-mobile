import { describe, expect, it } from 'vitest';
import { screens } from './catalog';
import {
  addRequestedChange,
  emptyChangeDraft,
  generateChangePrompt,
  restoreChangeDraft,
} from './model';
import { guideDocument, guideMessageSchema } from './bridge';
import { StorageChangeRequestRepository } from './repository';
import { createChangeRequestStore } from './store';
import { MemoryStorage } from '../../test/fixtures';

describe('screen change requests', () => {
  it('keeps unique screen/section IDs and covers the current product surfaces', () => {
    expect(new Set(screens.map((screen) => screen.id)).size).toBe(
      screens.length,
    );
    const sections = screens.flatMap((screen) => screen.sections);
    expect(new Set(sections.map((section) => section.id)).size).toBe(
      sections.length,
    );
    for (const id of [
      'T5',
      'R3',
      'E6',
      'F2',
      'C2',
      'K1',
      'N4',
      'I3',
      'S1',
      'W3',
      'P1',
      'G3',
      'X1',
    ])
      expect(sections.some((section) => section.id === id)).toBe(true);
  });
  it('collects and edits multiple targets and generates contextual instructions', () => {
    let draft = addRequestedChange(
      { ...emptyChangeDraft(), entry: 'Make the checkbox smaller' },
      'one',
    );
    draft = addRequestedChange(
      {
        ...draft,
        selectedScreen: 'W',
        selectedSection: 'W3',
        entry: 'Show three note lines',
      },
      'two',
    );
    draft = addRequestedChange(
      { ...draft, editingId: 'two', entry: 'Show two note lines' },
      'ignored',
    );
    expect(draft.items).toHaveLength(2);
    expect(draft.items[1]?.id).toBe('two');
    const prompt = generateChangePrompt(
      { ...draft, constraints: 'Keep colors' },
      '1.4.0',
    );
    for (const text of [
      'RoutineLog',
      'rados4y/routinelog-mobile',
      'Today · T3',
      'Android widget · W3',
      'Make the checkbox smaller',
      'Show two note lines',
      'Keep colors',
      'Current behavior:',
      'GitHub Actions',
      'runtime-compatible',
    ])
      expect(prompt).toContain(text);
    expect(prompt).not.toContain('Show three note lines');
  });
  it('rejects empty/oversized changes and an empty submission', () => {
    expect(() => addRequestedChange(emptyChangeDraft(), 'x')).toThrow();
    expect(() =>
      addRequestedChange(
        { ...emptyChangeDraft(), entry: 'x'.repeat(2001) },
        'x',
      ),
    ).toThrow();
    expect(() => generateChangePrompt(emptyChangeDraft(), '1.4.0')).toThrow(
      'at least one',
    );
    let draft = emptyChangeDraft();
    for (let i = 0; i < 20; i++)
      draft = addRequestedChange({ ...draft, entry: `Change ${i}` }, `id-${i}`);
    expect(() =>
      addRequestedChange({ ...draft, entry: 'Extra' }, 'extra'),
    ).toThrow('20');
  });
  it('retains saved target snapshots if a later guide changes its selection', () => {
    const draft = addRequestedChange(
      { ...emptyChangeDraft(), entry: 'Keep this request' },
      'one',
    );
    const restored = restoreChangeDraft({
      ...draft,
      selectedScreen: 'OLD',
      selectedSection: 'OLD1',
      editingId: 'missing',
    });
    expect(restored.selectedScreen).toBe('T');
    expect(restored.editingId).toBeNull();
    expect(restored.items).toEqual(draft.items);
  });
  it('embeds user text as JSON data rather than executable HTML and validates bridge messages', () => {
    const attack = '</script><script>window.injection=true</script>\u2028';
    const html = guideDocument(
      { ...emptyChangeDraft(), entry: attack },
      '1.4.0',
      'native',
    );
    const data =
      /<script type="application\/json" id="bootstrap">([\s\S]*?)<\/script>/.exec(
        html,
      )?.[1];
    expect(data).toBeDefined();
    expect(data).not.toContain('</script>');
    expect(JSON.parse(data!).draft.entry).toBe(attack);
    expect(
      guideMessageSchema.safeParse({
        channel: 'unknown',
        type: 'draft',
        draft: emptyChangeDraft(),
      }).success,
    ).toBe(false);
    expect(
      guideMessageSchema.safeParse({
        channel: 'routinelog-change-guide',
        type: 'copy',
        draft: emptyChangeDraft(),
      }).success,
    ).toBe(true);
  });
});
describe('change-request draft persistence', () => {
  it('persists a specific UI draft independently of routine and note repositories', async () => {
    const storage = new MemoryStorage();
    const repo = new StorageChangeRequestRepository(storage);
    const draft = addRequestedChange(
      { ...emptyChangeDraft(), entry: 'Change layout' },
      'one',
    );
    await repo.save(draft);
    expect(await new StorageChangeRequestRepository(storage).load()).toEqual(
      draft,
    );
    expect(await storage.getAllKeys()).toEqual([
      '@routinelog/ui/change-request/v1',
    ]);
  });
  it('orders overlapping saves and retains a failed draft for retry', async () => {
    let saved = emptyChangeDraft();
    let fail = true;
    const store = createChangeRequestStore({
      load: async () => saved,
      save: async (draft) => {
        if (fail) throw new Error('disk');
        saved = draft;
      },
    });
    await store.getState().load();
    const waitIdle = () =>
      new Promise<void>((resolve) => {
        if (!store.getState().saving) return resolve();
        const off = store.subscribe((state) => {
          if (!state.saving) {
            off();
            resolve();
          }
        });
      });
    store.getState().save({ ...saved, entry: 'Retain this' });
    await waitIdle();
    expect(store.getState().error).toContain('Could not save');
    expect(store.getState().draft.entry).toBe('Retain this');
    fail = false;
    store.getState().retry();
    store.getState().save({ ...store.getState().draft, entry: 'Newest' });
    await waitIdle();
    expect(saved.entry).toBe('Newest');
    expect(store.getState().error).toBeNull();
  });
});
