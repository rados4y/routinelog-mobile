import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWidgetViewRepository } from './viewState';

export const widgetViews = createWidgetViewRepository(AsyncStorage);
