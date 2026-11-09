import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import { StorageChangeRequestRepository } from '../features/changeRequests/repository';
import { createChangeRequestStore } from '../features/changeRequests/store';
export const changeRequestStore = createChangeRequestStore(
  new StorageChangeRequestRepository(AsyncStorage),
);
export const useChangeRequests = () => useStore(changeRequestStore);
