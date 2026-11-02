import type { RoutineInput } from '../domain/models';

const base = {
  active: true,
  target: null,
  unit: null,
  note: '',
  reminderTime: '08:00',
};
export const referencePresets: { id: string; input: RoutineInput }[] = [
  {
    id: 'preset-book',
    input: {
      ...base,
      name: 'Book: umysł ponad nastrojem',
      icon: '🎓',
      category: 'Rozwój',
      schedule: { kind: 'weekdays', days: [7] },
    },
  },
  {
    id: 'preset-pawel',
    input: {
      ...base,
      name: 'Rozmowa z Pawłem jak u niego jest',
      icon: '💬',
      category: 'Rodzina',
      schedule: {
        kind: 'monthlyDays',
        days: [],
        lastDay: true,
        flexible: true,
      },
    },
  },
  {
    id: 'preset-piotrek',
    input: {
      ...base,
      name: 'Rozmowa z Piotrkiem jak u niego jest',
      icon: '💬',
      category: 'Rodzina',
      schedule: {
        kind: 'monthlyDays',
        days: [15],
        lastDay: false,
        flexible: true,
      },
    },
  },
  {
    id: 'preset-parents',
    input: {
      ...base,
      name: 'Rozmowa z rodzicami jak u nich jest',
      icon: '💬',
      category: 'Rodzina',
      schedule: {
        kind: 'monthlyDays',
        days: [15],
        lastDay: true,
        flexible: true,
      },
    },
  },
  {
    id: 'preset-dog',
    input: {
      ...base,
      name: 'Wyjście na spacer z psem',
      icon: '🥾',
      category: 'Sport',
      schedule: { kind: 'weeklyTarget', count: 1 },
    },
  },
];
