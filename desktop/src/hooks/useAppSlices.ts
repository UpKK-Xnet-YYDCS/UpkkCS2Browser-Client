import { useContext } from 'react';
import {
  AppActionsContext,
  AppPreferencesContext,
  ServerDataContext,
  ServerFiltersContext,
} from '@/store/appContext';

function requireContext<T>(value: T | null, name: string): T {
  if (!value) throw new Error(`${name} must be used within an AppProvider`);
  return value;
}

export function useServerDataStore() {
  return requireContext(useContext(ServerDataContext), 'useServerDataStore');
}

export function useServerFiltersStore() {
  return requireContext(useContext(ServerFiltersContext), 'useServerFiltersStore');
}

export function useAppPreferencesStore() {
  return requireContext(useContext(AppPreferencesContext), 'useAppPreferencesStore');
}

export function useAppActions() {
  return requireContext(useContext(AppActionsContext), 'useAppActions');
}
