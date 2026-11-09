import { createStore } from 'zustand/vanilla';
import type { ChangeRequestRepository } from './repository';
import {
  emptyChangeDraft,
  restoreChangeDraft,
  type ChangeDraft,
} from './model';
interface State {
  draft: ChangeDraft;
  ready: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load(): Promise<void>;
  save(draft: ChangeDraft): void;
  retry(): void;
}
export function createChangeRequestStore(repository: ChangeRequestRepository) {
  let pending = Promise.resolve();
  let revision = 0;
  return createStore<State>((set, get) => ({
    draft: emptyChangeDraft(),
    ready: false,
    loading: false,
    saving: false,
    error: null,
    load: async () => {
      if (get().ready || get().loading) return;
      set({ loading: true, error: null });
      try {
        set({ draft: await repository.load(), ready: true });
      } catch {
        set({ error: 'Could not load the change-request draft. Try again.' });
      } finally {
        set({ loading: false });
      }
    },
    save: (input) => {
      if (!get().ready) return;
      const draft = restoreChangeDraft(input);
      const current = ++revision;
      set({ draft, saving: true, error: null });
      // Serial writes keep an older keystroke from overwriting a newer draft.
      pending = pending
        .then(() => repository.save(draft))
        .then(
          () => {
            if (current === revision) set({ saving: false, error: null });
          },
          () => {
            if (current === revision)
              set({
                saving: false,
                error:
                  'Could not save this draft. Your changes remain here; retry before closing the app.',
              });
          },
        );
    },
    retry: () => {
      if (get().ready) get().save(get().draft);
      else void get().load();
    },
  }));
}
