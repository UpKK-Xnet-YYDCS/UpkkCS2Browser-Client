import type { Dispatch, MutableRefObject } from 'react';
import {
  cancelPrefetch,
  hasCachedResponse,
  refreshEndpoint,
  type GeoFilterParams,
} from '@/api/client';
import {
  buildServerListEndpoint,
  getServers,
  getServersByCategory,
  prefetchServerPages,
  searchServers,
} from '@/api/servers';
import type { Action, AppState, FetchFilters, FetchOptions } from './appState';
import { getServerFetchPageInfo, toServerFetchStorePayload } from './fetchServersResult';

export function createFetchServers(
  dispatch: Dispatch<Action>,
  stateRef: MutableRefObject<AppState>,
  requestVersionRef: MutableRefObject<number>,
) {
  return async (page = 1, filters?: FetchFilters, options?: FetchOptions) => {
    const silent = options?.silent ?? false;

    // Cancel any in-progress prefetch only for non-silent fetches (user-driven navigation)
    if (!silent) {
      cancelPrefetch();
    }

    // Increment request version to invalidate any in-flight requests
    requestVersionRef.current += 1;
    const currentVersion = requestVersionRef.current;
    
    // Use provided filters or fall back to current state
    const currentState = stateRef.current;
    const searchQuery = filters?.searchQuery ?? currentState.searchQuery;
    const selectedCategory = filters?.selectedCategory !== undefined ? filters.selectedCategory : currentState.selectedCategory;
    const selectedRegion = filters?.selectedRegion ?? currentState.selectedRegion;
    const selectedGameType = filters?.selectedGameType ?? currentState.selectedGameType;
    const selectedContinent = filters?.selectedContinent ?? currentState.selectedContinent;
    const selectedGeoRegion = filters?.selectedGeoRegion ?? currentState.selectedGeoRegion;
    const selectedCountry = filters?.selectedCountry ?? currentState.selectedCountry;
    const perPage = filters?.perPage ?? currentState.perPage;
    
    // Build geo filter for server-side filtering
    const geoFilter: GeoFilterParams = {
      continent: selectedContinent,
      geo_region: selectedGeoRegion,
      country: selectedCountry,
    };

    // --- Cache-aware loading: skip spinner when the target page is already cached ---
    const endpoint = buildServerListEndpoint({
      searchQuery: searchQuery || undefined,
      selectedCategory,
      selectedRegion,
      selectedGameType,
      page,
      perPage,
      geoFilter,
    });
    const isCacheHit = hasCachedResponse(endpoint);

    // Only show loading spinner for non-silent, non-cached fetches
    if (!silent && !isCacheHit) {
      dispatch({ type: 'SET_LOADING', payload: true });
    }
    if (!silent) {
      dispatch({ type: 'SET_ERROR', payload: null });
    }
    
    // Helper: call the right API function.
    // When bypassCache is true, use refreshEndpoint to bypass the cache read and get fresh data.
    const fetchEndpoint = async (bypassCache: boolean) => {
      if (bypassCache) {
        if (searchQuery) {
          return { type: 'search' as const, data: await refreshEndpoint<import('@/types').SearchResponse>(endpoint) };
        } else if (selectedCategory) {
          return { type: 'category' as const, data: await refreshEndpoint<import('@/types').PaginatedResponse<import('@/types').ServerStatus>>(endpoint) };
        } else {
          return { type: 'default' as const, data: await refreshEndpoint<import('@/types').ServerStatus[] | import('@/types').PaginatedResponse<import('@/types').ServerStatus>>(endpoint) };
        }
      }
      // Normal mode: uses cache-aware fetchWithRetry via the public API functions
      if (searchQuery) {
        return { type: 'search' as const, data: await searchServers(searchQuery, selectedRegion, page, perPage, selectedGameType, geoFilter) };
      } else if (selectedCategory) {
        return { type: 'category' as const, data: await getServersByCategory(selectedCategory, selectedRegion, page, perPage, selectedGameType, geoFilter) };
      } else {
        return { type: 'default' as const, data: await getServers(selectedRegion, page, perPage, selectedGameType, geoFilter) };
      }
    };

    const dispatchServers = (result: Awaited<ReturnType<typeof fetchEndpoint>>, fallbackPage: number): void => {
      dispatch({ type: 'SET_SERVERS', payload: toServerFetchStorePayload(result, fallbackPage) });
    };

    try {
      const result = await fetchEndpoint(/* bypassCache */ silent);

      // Check if this request is still the latest one - discard stale responses
      if (requestVersionRef.current !== currentVersion) {
        return;
      }

      const { resultPage, resultTotalPages } = getServerFetchPageInfo(result, page);
      dispatchServers(result, page);

      // Trigger background prefetch of upcoming pages (skip for silent refreshes
      // since prefetched data is still valid from the previous non-silent fetch).
      if (!silent) {
        prefetchServerPages({
          currentPage: resultPage,
          totalPages: resultTotalPages,
          searchQuery: searchQuery || undefined,
          selectedCategory,
          selectedRegion,
          selectedGameType,
          perPage,
          geoFilter,
        });
      }

      // Stale-while-revalidate: when a non-silent fetch was served from cache,
      // schedule a deferred silent refresh so the user sees up-to-date data.
      if (!silent && isCacheHit) {
        setTimeout(async () => {
          if (requestVersionRef.current !== currentVersion) return;
          try {
            const freshResult = await fetchEndpoint(/* bypassCache */ true);
            if (requestVersionRef.current !== currentVersion) return;
            dispatchServers(freshResult, page);
          } catch {
            // Silently ignore background refresh errors
          }
        }, 500);
      }
    } catch (error) {
      // Silent mode: swallow errors — background refresh failures should not disrupt UX
      if (silent) return;

      // Only dispatch error if this is still the latest request
      if (requestVersionRef.current !== currentVersion) {
        return;
      }
      
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '获取服务器列表失败',
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };
}
