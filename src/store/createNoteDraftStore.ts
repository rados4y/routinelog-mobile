import { createStore } from 'zustand/vanilla';

export interface NoteDraftState {
  drafts: Record<string, { content: string; revision: number }>;
  saving: Record<string, boolean>;
  errors: Record<string, string | undefined>;
  edit(date: string, content: string): void;
  save(date: string): Promise<boolean>;
  flush(): Promise<boolean>;
}
export function createNoteDraftStore(
  write: (date: string, content: string) => Promise<boolean>,
) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const active = new Map<
    string,
    { revision: number; promise: Promise<boolean> }
  >();
  let revision = 0;
  return createStore<NoteDraftState>((set, get) => ({
    drafts: {},
    saving: {},
    errors: {},
    edit: (date, content) => {
      set({
        drafts: { ...get().drafts, [date]: { content, revision: ++revision } },
        errors: { ...get().errors, [date]: undefined },
      });
      clearTimeout(timers.get(date));
      timers.set(
        date,
        setTimeout(() => {
          timers.delete(date);
          void get().save(date);
        }, 600),
      );
    },
    save: (date) => {
      clearTimeout(timers.get(date));
      timers.delete(date);
      const draft = get().drafts[date];
      if (!draft) return Promise.resolve(true);
      const existing = active.get(date);
      if (existing)
        return existing.promise.then((ok) =>
          get().drafts[date]?.revision !== existing.revision &&
          get().drafts[date]
            ? get().save(date)
            : ok,
        );
      set({ saving: { ...get().saving, [date]: true } });
      const promise = Promise.resolve().then(async () => {
        let ok = false;
        try {
          ok = await write(date, draft.content);
        } catch {
          /* Keep the draft available to retry. */
        }
        const drafts = { ...get().drafts };
        if (ok && drafts[date]?.revision === draft.revision)
          delete drafts[date];
        set({
          drafts,
          errors: {
            ...get().errors,
            [date]: ok
              ? undefined
              : 'Could not save this note. Your text is kept here. Try again.',
          },
          saving: { ...get().saving, [date]: false },
        });
        active.delete(date);
        return ok;
      });
      active.set(date, { revision: draft.revision, promise });
      return promise;
    },
    flush: async () => {
      const results = await Promise.all(
        Object.keys(get().drafts).map((date) => get().save(date)),
      );
      return results.every(Boolean) && !Object.keys(get().drafts).length;
    },
  }));
}
