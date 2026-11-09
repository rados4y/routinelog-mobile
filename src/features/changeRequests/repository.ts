import type { KeyValueStorage } from '../../data/repositories';
import {
  emptyChangeDraft,
  restoreChangeDraft,
  type ChangeDraft,
} from './model';
export interface ChangeRequestRepository {
  load(): Promise<ChangeDraft>;
  save(draft: ChangeDraft): Promise<void>;
}
export const changeDraftKey = '@routinelog/ui/change-request/v1';
export class StorageChangeRequestRepository implements ChangeRequestRepository {
  constructor(private storage: Pick<KeyValueStorage, 'getItem' | 'setItem'>) {}
  async load() {
    const raw = await this.storage.getItem(changeDraftKey);
    return raw ? restoreChangeDraft(JSON.parse(raw)) : emptyChangeDraft();
  }
  async save(draft: ChangeDraft) {
    await this.storage.setItem(
      changeDraftKey,
      JSON.stringify(restoreChangeDraft(draft)),
    );
  }
}
