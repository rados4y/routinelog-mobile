import { describe, expect, it } from 'vitest';
import { checklistIsComplete, requireCompleteChecklist } from './checklist';
import { nextStatus } from './status';
import { checklistSchema } from './models';
import { createLog } from './log';
import { updateRoutine, routineOn } from './routine';
import { historyForRange } from './history';
import { getStats } from './insights';
import { monday, routine } from '../test/fixtures';

const items = [
  { id: 'a', text: 'Rozgrzewka' },
  { id: 'b', text: 'Ćwiczenia' },
];
const proof = items.map((item) => ({ ...item, checked: true }));
describe('status cycle and completion checklists', () => {
  it('cycles all four explicit states, beginning and ending unchecked', () => {
    let status = nextStatus();
    expect(status).toBe('done');
    status = nextStatus(status);
    expect(status).toBe('missed');
    status = nextStatus(status);
    expect(status).toBe('skipped');
    expect(nextStatus(status)).toBe('pending');
  });
  it('requires every distinct current step with its current label', () => {
    expect(checklistIsComplete(items, proof)).toBe(true);
    for (const invalid of [
      [],
      proof.slice(0, 1),
      [proof[0]!, proof[0]!],
      proof.map((step) => ({ ...step, checked: false })),
      [{ ...proof[0]!, text: 'Old label' }, proof[1]!],
    ]) {
      expect(checklistIsComplete(items, invalid)).toBe(false);
      expect(() => requireCompleteChecklist(items, invalid)).toThrow(
        'Potwierdź',
      );
    }
    expect(requireCompleteChecklist()).toEqual([]);
    expect(checklistSchema.safeParse([items[0], items[0]]).success).toBe(false);
    expect(
      checklistSchema.safeParse([{ id: 'blank', text: '  ' }]).success,
    ).toBe(false);
  });
  it('requires proof for done, allows missed/skipped and snapshots confirmed steps', () => {
    const r = { ...routine(), checklist: items };
    expect(() => createLog(r, monday, 'done')).toThrow('Potwierdź');
    expect(createLog(r, monday, 'done', undefined, proof).checklist).toEqual(
      proof,
    );
    expect(createLog(r, monday, 'missed').checklist).toBeUndefined();
    expect(createLog(r, monday, 'skipped').checklist).toBeUndefined();
  });
  it('does not add newly introduced steps to historical revisions', () => {
    const r = routine();
    const updated = updateRoutine(
      r,
      { ...r, checklist: items },
      new Date('2026-10-13T12:00:00'),
    );
    expect(routineOn(updated, monday)?.checklist).toBeUndefined();
    expect(routineOn(updated, '2026-10-13')?.checklist).toEqual(items);
  });
  it.each([1, 3])(
    'counts explicit missed once within a closed weekly target of %s',
    (count) => {
      const r = routine({ kind: 'weeklyTarget', count });
      const logs = [
        createLog(r, monday, 'missed', new Date('2026-10-19T12:00:00')),
      ];
      const history = historyForRange(
        [r],
        logs,
        monday,
        '2026-10-18',
        new Date('2026-10-19T12:00:00'),
      );
      expect(
        history
          .filter((entry) => entry.status === 'missed')
          .reduce((sum, entry) => sum + entry.missingCount, 0),
      ).toBe(count);
      expect(getStats([r], logs, new Date('2026-10-18T12:00:00')).missed).toBe(
        1,
      );
    },
  );
});
