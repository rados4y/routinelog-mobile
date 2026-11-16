import { z } from 'zod';
import type { KeyValueStorage } from '../data/repositories';
import { addDays, localDate } from '../domain/dates';
import { taskSchema, type DailyTask } from '../domain/task';

const expansionSchema = z.object({
  kind: z.enum(['routine', 'task', 'note']),
  id: z.string().min(1),
});
const viewSchema = z.object({
  date: z.iso.date(),
  viewedOn: z.iso.date(),
  expanded: expansionSchema.optional(),
  undo: z.object({ task: taskSchema, from: z.iso.date() }).optional(),
});
export type WidgetView = z.infer<typeof viewSchema>;
const actions = ['previous_day', 'next_day', 'today'] as const;
export type WidgetNavigation = (typeof actions)[number];
export const isWidgetNavigation = (
  action?: string,
): action is WidgetNavigation => actions.some((value) => value === action);

// Launcher selection is UI state, separate from routine/log repositories. Each
// widget has its own date; all widgets return to Today after local midnight.
export function createWidgetViewRepository(storage: KeyValueStorage) {
  const key = (id: number) => `@routinelog/widget-view/${id}`;
  const current = (now: Date): WidgetView => ({
    date: localDate(now),
    viewedOn: localDate(now),
  });
  const get = async (id: number, now = new Date()) => {
    const raw = await storage.getItem(key(id));
    if (raw === null) return current(now);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return current(now);
    }
    const result = viewSchema.safeParse(data);
    return result.success && result.data.viewedOn === localDate(now)
      ? result.data
      : current(now);
  };
  let pending = Promise.resolve();
  const navigate = (
    id: number,
    action: WidgetNavigation,
    payload: unknown,
    now = new Date(),
  ): Promise<WidgetView> => {
    const task = pending.then(async () => {
      const view = await get(id, now);
      const click = viewSchema.safeParse(payload);
      if (
        !click.success ||
        click.data.viewedOn !== localDate(now) ||
        click.data.date !== view.date
      )
        return view;
      const date =
        action === 'today'
          ? localDate(now)
          : addDays(view.date, action === 'previous_day' ? -1 : 1);
      const next = { date, viewedOn: localDate(now) };
      await storage.setItem(key(id), JSON.stringify(next));
      return next;
    });
    pending = task.then(
      () => {},
      () => {},
    );
    return task;
  };
  const update = (
    id: number,
    work: (view: WidgetView) => WidgetView,
    now = new Date(),
  ) => {
    const task = pending.then(async () => {
      const next = work(await get(id, now));
      await storage.setItem(key(id), JSON.stringify(next));
      return next;
    });
    pending = task.then(
      () => {},
      () => {},
    );
    return task;
  };
  return {
    get,
    navigate,
    remove: (id: number) => storage.removeItem(key(id)),
    expand: (id: number, payload: unknown, now = new Date()) =>
      update(
        id,
        (view) => {
          const parsed = viewSchema
            .extend({
              kind: expansionSchema.shape.kind,
              id: expansionSchema.shape.id,
            })
            .safeParse(payload);
          if (
            !parsed.success ||
            parsed.data.date !== view.date ||
            parsed.data.viewedOn !== localDate(now)
          )
            return view;
          const target = { kind: parsed.data.kind, id: parsed.data.id };
          return {
            ...view,
            expanded:
              view.expanded?.kind === target.kind &&
              view.expanded.id === target.id
                ? undefined
                : target,
          };
        },
        now,
      ),
    setUndo: (id: number, task?: DailyTask, from?: string) =>
      update(id, (view) => ({
        ...view,
        expanded: undefined,
        undo: task && from ? { task, from } : undefined,
      })),
  };
}
