import { describe, expect, it } from 'vitest';
import { MemoryStorage, routine } from '../test/fixtures';
import { createWidgetViewRepository } from './viewState';
import { todayWidgetModel } from './model';
import { cycleFromWidget } from './actions';

const now = () => new Date('2026-11-05T12:00:00');
describe('widget date selection', () => {
  it('persists navigation independently per widget and returns to Today on heading tap', async () => {
    const storage = new MemoryStorage();
    const views = createWidgetViewRepository(storage);
    const today = await views.get(1, now());
    const past = await views.navigate(1, 'previous_day', today, now());
    expect(past.date).toBe('2026-11-04');
    expect(await views.get(2, now())).toEqual(today);
    const reload = createWidgetViewRepository(storage);
    expect(await reload.get(1, now())).toEqual(past);
    expect(await reload.navigate(1, 'today', past, now())).toEqual(today);
    await reload.remove(1);
    expect(await storage.getAllKeys()).toEqual([]);
  });
  it('ignores duplicate navigation, resets at midnight and rejects stale payloads', async () => {
    const views = createWidgetViewRepository(new MemoryStorage());
    const today = await views.get(1, now());
    const [first, duplicate] = await Promise.all([
      views.navigate(1, 'next_day', today, now()),
      views.navigate(1, 'next_day', today, now()),
    ]);
    expect(first.date).toBe('2026-11-06');
    expect(duplicate).toEqual(first);
    const tomorrow = new Date('2026-11-06T08:00:00');
    expect(await views.get(1, tomorrow)).toEqual({
      date: '2026-11-06',
      viewedOn: '2026-11-06',
    });
    expect(await views.navigate(1, 'previous_day', first, tomorrow)).toEqual(
      await views.get(1, tomorrow),
    );
    expect(await views.navigate(1, 'next_day', {}, tomorrow)).toEqual(
      await views.get(1, tomorrow),
    );
  });
  it('recovers invalid view preferences without touching routine data', async () => {
    const storage = new MemoryStorage();
    await storage.setItem('@routinelog/widget-view/1', 'bad JSON');
    await storage.setItem('routine', 'preserved');
    const view = await createWidgetViewRepository(storage).get(1, now());
    expect(view.date).toBe('2026-11-05');
    expect(await storage.getItem('routine')).toBe('preserved');
  });
  it('projects the selected day without allowing old or future status writes', async () => {
    const r = routine();
    const state = {
      ready: true,
      saving: false,
      routines: [r],
      logs: [],
      setStatus: async () => {
        throw new Error('Should not write');
      },
    };
    expect(todayWidgetModel([r], [], now()).title).toBe('Today');
    for (const [date, title] of [
      ['2026-11-04', 'Yesterday'],
      ['2026-11-06', 'Tomorrow'],
    ]) {
      const model = todayWidgetModel([r], [], now(), date);
      expect(model.title).toBe(title);
      expect(model.isToday).toBe(false);
      expect(model.date).toBe(date);
      expect(await cycleFromWidget(state, model.items[0]!.click, now())).toBe(
        'stale',
      );
    }
  });
});
