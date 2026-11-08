import { create } from 'zustand';
import type { WidgetFocus } from '../widgets/focus';

// Transient navigation intent, separate from persisted routines, logs and notes.
export const useTodayFocus = create<{
  target: WidgetFocus | null;
  request: number;
  open(target: WidgetFocus): void;
  clear(): void;
}>((set) => ({
  target: null,
  request: 0,
  open: (target) => set((state) => ({ target, request: state.request + 1 })),
  clear: () => set({ target: null }),
}));
