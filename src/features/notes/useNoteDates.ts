import { useMemo } from 'react';
import { datesWithNotes } from '../../domain/note';
import { useRoutines } from '../../store/useRoutines';
import { useNoteDrafts } from '../../store/useNoteDrafts';

export function useNoteDates() {
  const notes = useRoutines((state) => state.notes);
  const drafts = useNoteDrafts((state) => state.drafts);
  return useMemo(() => datesWithNotes(notes, drafts), [notes, drafts]);
}
