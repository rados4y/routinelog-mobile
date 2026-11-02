import type { OccurrenceStatus } from './models';

const cycle: Record<OccurrenceStatus, OccurrenceStatus> = {
  pending: 'done',
  done: 'missed',
  missed: 'skipped',
  skipped: 'pending',
};
export const nextStatus = (
  status: OccurrenceStatus = 'pending',
): OccurrenceStatus => cycle[status];
export const statusLabels: Record<OccurrenceStatus, string> = {
  pending: 'Bez oznaczenia',
  done: 'Wykonane',
  missed: 'Niewykonane',
  skipped: 'Pominięte',
};
export const nextActionLabel = (status: OccurrenceStatus = 'pending') =>
  `Następny status: ${statusLabels[nextStatus(status)]}`;
