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
]);
export type Schedule = z.infer<typeof scheduleSchema>;
export const routineInputSchema = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę rutyny.').max(100),
  icon: z.string().trim().min(1).max(16),
  category: z.enum(categories),
  active: z.boolean(),
  schedule: scheduleSchema,
  target: z.number().positive().nullable(),
  unit: z.string().max(30).nullable(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Podaj godzinę HH:MM.'),
  note: z.string().max(1000),
});
export type RoutineInput = z.infer<typeof routineInputSchema>;
export const routineSchema = routineInputSchema.extend({
  id: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  effectiveFrom: dateSchema,
  deletedAt: z.iso.datetime().nullable(),
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
  source: z.enum(['app', 'chatgpt', 'automation']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  routineName: z.string(),
  routineIcon: z.string(),
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
}
