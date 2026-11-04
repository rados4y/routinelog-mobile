import type { RoutineInput } from '../domain/models';
export const colors = {
  background: '#111111',
  panel: '#1e1e1e',
  panelSecondary: '#262626',
  border: '#292929',
  text: '#f5f5f5',
  muted: '#a4a4a4',
  accent: '#c7355c',
  accentLight: '#e15478',
  success: '#35c46a',
  warning: '#f2a93b',
  danger: '#ef5b5b',
} as const;
export const categoryColors = {
  Zdrowie: '#da6180',
  Sport: '#d97134',
  Dom: '#5b99d1',
  Rozwój: '#9c61e7',
  Rodzina: '#34ad8b',
  Inne: '#c28c4c',
} as const satisfies Record<RoutineInput['category'], `#${string}`>;
