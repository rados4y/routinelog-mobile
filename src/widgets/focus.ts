import { z } from 'zod';
import { dateSchema } from '../domain/models';

export const widgetFocusSchema = z.discriminatedUnion('focus', [
  z.object({ focus: z.literal('note'), date: dateSchema }),
  z.object({
    focus: z.literal('routine'),
    date: dateSchema,
    routineId: z.string().min(1),
  }),
]);
export type WidgetFocus = z.infer<typeof widgetFocusSchema>;

export function widgetFocusUrl(target: WidgetFocus): string {
  const query = `focus=${target.focus}&date=${target.date}`;
  return `routinelog://widget-open?${query}${target.focus === 'routine' ? `&routineId=${encodeURIComponent(target.routineId)}` : ''}`;
}
