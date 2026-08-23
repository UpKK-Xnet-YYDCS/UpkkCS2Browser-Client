import { useEffect, useRef } from 'react';
import { persistAppState, type PersistedAppState } from './appPersist';

const PERSIST_DEBOUNCE_MS = 500;

export function useDebouncedAppPersist(state: PersistedAppState): void {
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const persisted: PersistedAppState = {
      favorites: state.favorites,
      apiBaseUrl: state.apiBaseUrl,
      selectedRegion: state.selectedRegion,
      selectedGameType: state.selectedGameType,
      selectedContinent: state.selectedContinent,
      selectedGeoRegion: state.selectedGeoRegion,
      selectedCountry: state.selectedCountry,
      viewMode: state.viewMode,
      perPage: state.perPage,
      cardMinWidth: state.cardMinWidth,
    };
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistAppState(persisted);
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [
    state.favorites,
    state.apiBaseUrl,
    state.selectedRegion,
    state.selectedGameType,
    state.selectedContinent,
    state.selectedGeoRegion,
    state.selectedCountry,
    state.viewMode,
    state.perPage,
    state.cardMinWidth,
  ]);
}
