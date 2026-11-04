import type { RoutineInput } from '../domain/models';

// Stable stored category keys and the existing Notion schema remain compatible.
export const categoryLabels: Record<RoutineInput['category'], string> = {
  Zdrowie: 'Health',
  Sport: 'Fitness',
  Dom: 'Home',
  Rozwój: 'Learning',
  Rodzina: 'Family',
  Inne: 'Other',
};
export const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const locale = 'en-GB';
