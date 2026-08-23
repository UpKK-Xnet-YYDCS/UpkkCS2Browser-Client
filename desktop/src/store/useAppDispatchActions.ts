import { useCallback, type Dispatch } from 'react';
import type { GameType, ServerRegion } from '@/types';
import type { ViewMode } from '@/types/ui';
import { setApiBaseUrl as persistApiBaseUrl } from '@/api/client';
import type { Action } from './appState';

export function useAppDispatchActions(dispatch: Dispatch<Action>) {
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, [dispatch]);

  const setSelectedRegion = useCallback((region: ServerRegion) => {
    dispatch({ type: 'SET_REGION', payload: region });
  }, [dispatch]);

  const setSelectedGameType = useCallback((gameType: GameType) => {
    dispatch({ type: 'SET_GAME_TYPE', payload: gameType });
  }, [dispatch]);

  const setSelectedContinent = useCallback((continent: string) => {
    dispatch({ type: 'SET_CONTINENT', payload: continent });
  }, [dispatch]);

  const setSelectedGeoRegion = useCallback((geoRegion: string) => {
    dispatch({ type: 'SET_GEO_REGION', payload: geoRegion });
  }, [dispatch]);

  const setSelectedCountry = useCallback((country: string) => {
    dispatch({ type: 'SET_COUNTRY', payload: country });
  }, [dispatch]);

  const setSelectedCategory = useCallback((category: string | null) => {
    dispatch({ type: 'SET_CATEGORY', payload: category });
  }, [dispatch]);

  const setApiBaseUrl = useCallback((url: string) => {
    persistApiBaseUrl(url);
    dispatch({ type: 'SET_API_URL', payload: url });
  }, [dispatch]);

  const addFavorite = useCallback((addr: string) => {
    dispatch({ type: 'ADD_FAVORITE', payload: addr });
  }, [dispatch]);

  const removeFavorite = useCallback((addr: string) => {
    dispatch({ type: 'REMOVE_FAVORITE', payload: addr });
  }, [dispatch]);

  const importFavorites = useCallback((addrs: string[]) => {
    dispatch({ type: 'SET_FAVORITES', payload: addrs });
  }, [dispatch]);

  const reorderFavorites = useCallback((from: number, to: number) => {
    dispatch({ type: 'REORDER_FAVORITES', payload: { from, to } });
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, [dispatch]);

  const setPerPage = useCallback((perPage: number) => {
    dispatch({ type: 'SET_PER_PAGE', payload: perPage });
  }, [dispatch]);

  const setCardMinWidth = useCallback((width: number) => {
    dispatch({ type: 'SET_CARD_MIN_WIDTH', payload: width });
  }, [dispatch]);

  return {
    setSearchQuery,
    setSelectedRegion,
    setSelectedGameType,
    setSelectedContinent,
    setSelectedGeoRegion,
    setSelectedCountry,
    setSelectedCategory,
    setApiBaseUrl,
    addFavorite,
    removeFavorite,
    importFavorites,
    reorderFavorites,
    clearError,
    setViewMode,
    setPerPage,
    setCardMinWidth,
  };
}
