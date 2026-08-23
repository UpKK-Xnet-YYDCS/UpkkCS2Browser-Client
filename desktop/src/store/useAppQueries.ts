import { useCallback, type Dispatch, type MutableRefObject } from 'react';
import { getCategories, getServerMetadata, getStats } from '@/api/servers';
import { createFetchServers } from './fetchServers';
import type { Action, AppState, FetchFilters, FetchOptions } from './appState';

export function useAppQueries(
  dispatch: Dispatch<Action>,
  stateRef: MutableRefObject<AppState>,
  requestVersionRef: MutableRefObject<number>,
) {
  const fetchServers = useCallback((page = 1, filters?: FetchFilters, options?: FetchOptions) => {
    return createFetchServers(dispatch, stateRef, requestVersionRef)(page, filters, options);
  }, [dispatch, requestVersionRef, stateRef]);

  const fetchCategories = useCallback(async () => {
    try {
      const categories = await getCategories();
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [dispatch]);

  const fetchStats = useCallback(async () => {
    try {
      const stats = await getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [dispatch]);

  const fetchMetadata = useCallback(async () => {
    try {
      const currentState = stateRef.current;
      const metadata = await getServerMetadata(
        currentState.selectedRegion,
        currentState.selectedGameType,
        currentState.selectedCategory || undefined,
      );
      dispatch({ type: 'SET_METADATA', payload: { countries: metadata.countries || [], maps: metadata.maps || [] } });
    } catch (error) {
      console.error('Failed to fetch server metadata:', error);
    }
  }, [dispatch, stateRef]);

  return { fetchServers, fetchCategories, fetchStats, fetchMetadata };
}
