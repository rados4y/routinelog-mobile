import { z } from 'zod';
import {
  categories,
  routineInputSchema,
  type ChecklistItem,
  type RoutineInput,
} from '../../../domain/models';
import { categoryLabels } from '../../../i18n/en';
import { noteWrite } from '../dailyNotes';
import { frequencyText, parseFrequency } from './frequency';
import type { MasterValue } from './models';

export const masterProperties = {
  Name: { title: {} },
  'Routine ID': { rich_text: {} },
  Icon: { rich_text: {} },
  Category: {
    select: {
      options: categories.map((category) => ({
        name: categoryLabels[category],
      })),
    },
  },
  Frequency: { rich_text: {} },
  'Start date': { date: {} },
  'End date': { date: {} },
  Time: { rich_text: {} },
  Description: { rich_text: {} },
  Checklist: { rich_text: {} },
  Active: { checkbox: {} },
  Archived: { checkbox: {} },
  Target: { number: {} },
  Unit: { rich_text: {} },
};
export const richTextString = (value: unknown): string =>
  z
    .array(
      z.object({
        plain_text: z.string().optional(),
        text: z.object({ content: z.string() }).optional(),
      }),
    )
    .parse(value)
    .map((part) => part.plain_text ?? part.text?.content ?? '')
    .join('');
const propertySchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  title: z.unknown().optional(),
  rich_text: z.unknown().optional(),
  checkbox: z.boolean().optional(),
  select: z.object({ name: z.string() }).nullable().optional(),
  date: z.object({ start: z.string() }).nullable().optional(),
  number: z.number().nullable().optional(),
});
export function readMasterInput(
  raw: Record<string, unknown>,
  id: string,
): { input: RoutineInput; archived: boolean; routineId: string } {
  const props = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      propertySchema.parse(value),
    ]),
  );
  for (const [name, settings] of Object.entries(masterProperties)) {
    if (props[name]?.type !== Object.keys(settings)[0])
      throw new Error(
        `Restore the ${name} property and its original type in the Routines database. No routine was removed.`,
      );
  }
  const string = (name: string) => richTextString(props[name]!.rich_text);
  const category =
    categories.find(
      (item) =>
        categoryLabels[item] === props.Category!.select?.name ||
        item === props.Category!.select?.name,
    ) ?? (props.Category!.select === null ? 'Inne' : undefined);
  const input = routineInputSchema.safeParse({
    name: richTextString(props.Name!.title),
    icon: string('Icon') || '✅',
    category,
    active: props.Active!.checkbox,
    schedule: parseFrequency(string('Frequency')),
    reminderTime: string('Time') || '08:00',
    note: string('Description'),
    checklist: string('Checklist')
      ? string('Checklist')
          .split('\n')
          .map((line, index) => ({
            id: `notion-${id}-step-${index}`,
            text: decodeStep(line),
          }))
      : [],
    startDate: props['Start date']!.date?.start.slice(0, 10),
    endDate: props['End date']!.date?.start.slice(0, 10) ?? null,
    target: props.Target!.number ?? null,
    unit: string('Unit') || null,
  });
  if (!input.success)
    throw new Error(
      'Invalid routine in Notion. Check Name, Category, Time, Description, Checklist and Start/End dates; no local data was removed.',
    );
  if (
    input.data.startDate &&
    input.data.endDate &&
    input.data.endDate < input.data.startDate
  )
    throw new Error(
      'End date must be on or after Start date in the Routines database.',
    );
  return {
    input: input.data,
    archived: props.Archived!.checkbox ?? false,
    routineId: string('Routine ID') || `notion-${id}`,
  };
}
const encodeStep = (text: string) =>
  text.replaceAll('\\', '\\\\').replaceAll('\n', '\\n');
function decodeStep(text: string): string {
  return text.replace(/\\(\\|n)/g, (_, char: string) =>
    char === 'n' ? '\n' : char,
  );
}
export const checklistText = (items: ChecklistItem[]) =>
  items.map((item) => encodeStep(item.text)).join('\n');
export function routineProperties(
  routineId: string,
  value: MasterValue,
): Record<string, unknown> {
  return {
    Name: { title: noteWrite(value.name).rich_text },
    'Routine ID': noteWrite(routineId),
    Icon: noteWrite(value.icon),
    Category: { select: { name: categoryLabels[value.category] } },
    Frequency: noteWrite(frequencyText(value.schedule)),
    'Start date': { date: { start: value.startDate } },
    'End date': { date: value.endDate ? { start: value.endDate } : null },
    Time: noteWrite(value.reminderTime),
    Description: noteWrite(value.note),
    Checklist: noteWrite(checklistText(value.checklist)),
    Active: { checkbox: value.active },
    Archived: { checkbox: value.archived },
    Target: { number: value.target },
    Unit: noteWrite(value.unit ?? ''),
  };
}
