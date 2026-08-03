import { useSyncExternalStore } from 'react';
import {
  getNavigationLabelMode,
  setNavigationLabelMode,
  subscribeNavigationLabelMode,
} from '@/services/navigationPreferences';

export function useNavigationLabelMode() {
  const mode = useSyncExternalStore(
    subscribeNavigationLabelMode,
    getNavigationLabelMode,
    getNavigationLabelMode,
  );
  return { mode, setMode: setNavigationLabelMode };
}
