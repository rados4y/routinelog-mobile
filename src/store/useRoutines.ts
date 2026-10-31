import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import { repositories } from '../data/repositories';
import { createRoutineStore, type RoutineState } from './createRoutineStore';

export const routineStore = createRoutineStore(repositories(AsyncStorage));
export function useRoutines<T>(selector: (state: RoutineState) => T): T {
  return useStore(routineStore, selector);
}
