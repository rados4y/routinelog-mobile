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
  pending: 'Unchecked',
  done: 'Done',
  missed: 'Not done',
  skipped: 'Skipped',
};
export const nextActionLabel = (status: OccurrenceStatus = 'pending') =>
  `Next status: ${statusLabels[nextStatus(status)]}`;
