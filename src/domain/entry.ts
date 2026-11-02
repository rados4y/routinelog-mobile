import { localDate } from './dates';
import { dateSchema, type Routine } from './models';
import { routineOn } from './routine';
import { routineForEntry } from './schedule';

export type EntryMode = 'scheduled' | 'calendar';

// A calendar is also a manual journal. An explicit entry does not move the
// schedule start, create past occurrences, or change the automatic missed rules.
export function routineForStatusEntry(
  original: Routine,
  date: string,
  mode: EntryMode = 'scheduled',
  hasLog = false,
): Routine | undefined {
  const historical = routineOn(original, date);
  if (hasLog) return historical ?? original;
  const scheduled = routineForEntry(original, date);
  if (scheduled) return scheduled;
  if (mode === 'calendar' && original.active && !original.deletedAt)
    return historical ?? original;
  return undefined;
}
export function entryBlockReason(
  original: Routine,
  date: string,
  mode: EntryMode,
  hasLog = false,
  today = localDate(),
): string | undefined {
  if (!dateSchema.safeParse(date).success) return 'Nieprawidłowa data.';
  if (date > today)
    return 'Przyszły termin — status możesz zapisać najwcześniej tego dnia.';
  if (!routineForStatusEntry(original, date, mode, hasLog))
    return mode === 'calendar'
      ? 'Rutyna jest wyłączona. Włącz ją, aby dodać nowy wpis.'
      : 'Rutyna nie jest zaplanowana na ten dzień.';
  return undefined;
}
export class EntryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntryUnavailableError';
  }
}
