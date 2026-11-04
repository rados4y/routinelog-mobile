import { z } from 'zod';

export const categories = [
  'Zdrowie',
  'Sport',
  'Dom',
  'Rozwój',
  'Rodzina',
  'Inne',
] as const;
export const dateSchema = z.iso.date();
export type LocalDate = string;
export const scheduleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('daily') }),
  z.object({
    kind: z.literal('weekdays'),
    days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    flexible: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('interval'),
    every: z.number().int().min(1).max(3650),
    anchor: dateSchema,
  }),
  z.object({
    kind: z.literal('weeklyTarget'),
    count: z.number().int().min(1).max(7),
  }),
  z
    .object({
      kind: z.literal('monthlyDays'),
      days: z.array(z.number().int().min(1).max(31)).max(31),
      lastDay: z.boolean(),
      flexible: z.boolean(),
    })
    .refine(
      (value) => value.days.length > 0 || value.lastDay,
      'Select at least one day.',
    ),
  z
    .object({
      kind: z.literal('monthlyWeekdays'),
      weeks: z.array(z.number().int().min(1).max(5)).max(5),
      lastWeek: z.boolean(),
      days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
      flexible: z.boolean(),
    })
    .refine(
      (value) => value.weeks.length > 0 || value.lastWeek,
      'Select a week of the month.',
    ),
  z.object({
    kind: z.literal('yearlyDates'),
    dates: z
      .array(
        z
          .object({
            month: z.number().int().min(1).max(12),
            day: z.number().int().min(1).max(31),
          })
          .refine(
            (value) =>
              value.day <=
              new Date(Date.UTC(2000, value.month, 0)).getUTCDate(),
            'Invalid day of the month.',
          ),
      )
      .min(1)
      .max(366),
    flexible: z.boolean(),
  }),
  z.object({
    kind: z.literal('monthlyTarget'),
    count: z.number().int().min(1).max(31),
  }),
]);
export type Schedule = z.infer<typeof scheduleSchema>;
export const checklistItemSchema = z.object({
  id: z.string().min(1).max(100),
  text: z.string().trim().min(1, 'Fill in or remove the empty step.').max(200),
});
export const checklistSchema = z
  .array(checklistItemSchema)
  .max(30)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    'Each step must have a unique ID.',
  );
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export const checklistResultSchema = checklistItemSchema.extend({
  checked: z.boolean(),
});
export type ChecklistResult = z.infer<typeof checklistResultSchema>;
export const routineInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a routine name.').max(100),
  icon: z.string().trim().min(1).max(16),
  category: z.enum(categories),
  active: z.boolean(),
  schedule: scheduleSchema,
  target: z.number().positive().nullable(),
  unit: z.string().max(30).nullable(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter the time as HH:MM.'),
  note: z.string().max(1000),
  checklist: checklistSchema.optional(),
});
export type RoutineInput = z.infer<typeof routineInputSchema>;
export const routineSchema = routineInputSchema.extend({
  id: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  effectiveFrom: dateSchema,
  deletedAt: z.iso.datetime().nullable(),
  sortOrder: z.number().nonnegative().optional(),
  revisions: z.array(
    z.object({ from: dateSchema, until: dateSchema, data: routineInputSchema }),
  ),
});
export type Routine = z.infer<typeof routineSchema>;
export const logSchema = z.object({
  id: z.string(),
  routineId: z.string(),
  scheduledFor: dateSchema,
  status: z.enum(['done', 'skipped', 'missed']),
  completedAt: z.iso.datetime().nullable(),
  value: z.number().nullable(),
  note: z.string(),
  source: z.enum(['app', 'chatgpt', 'automation', 'notion']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  routineName: z.string(),
  routineIcon: z.string(),
  checklist: z.array(checklistResultSchema).max(30).optional(),
});
export type RoutineLog = z.infer<typeof logSchema>;
export type OccurrenceStatus = 'pending' | RoutineLog['status'];
export interface Occurrence {
  routine: Routine;
  date: LocalDate;
  status: OccurrenceStatus;
  overdue: boolean;
  log?: RoutineLog;
  weeklyProgress?: { done: number; target: number };
  windowProgress?: {
    done: number;
    target: number;
    start: LocalDate;
    end: LocalDate;
  };
}
