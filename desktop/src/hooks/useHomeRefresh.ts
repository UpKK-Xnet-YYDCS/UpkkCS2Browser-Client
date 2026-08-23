import { useCallback, useEffect, useRef, useState } from 'react';
import { clearResponseCache } from '@/api/client';
import type { GameType, ServerRegion } from '@/types';
import type { FetchFilters, FetchOptions } from '@/store';

interface UseHomeRefreshOptions {
  fetchServers: (page?: number, filters?: FetchFilters, options?: FetchOptions) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchMetadata: () => Promise<void>;
  currentPage: number;
  searchQuery: string;
  selectedRegion: ServerRegion;
  selectedGameType: GameType;
  selectedCategory: string | null;
  selectedContinent: string;
  selectedGeoRegion: string;
  selectedCountry: string;
  perPage: number;
  isLoading: boolean;
  favLoading: boolean;
  showFavoritesOnly: boolean;
  fetchFavServers: () => Promise<void> | void;
}

const DEFAULT_AUTO_REFRESH_INTERVAL = 60;

export function useHomeRefresh({
  fetchServers,
  fetchStats,
  fetchMetadata,
  currentPage,
  searchQuery,
  selectedRegion,
  selectedGameType,
  selectedCategory,
  selectedContinent,
  selectedGeoRegion,
  selectedCountry,
  perPage,
  isLoading,
  favLoading,
  showFavoritesOnly,
  fetchFavServers,
}: UseHomeRefreshOptions) {
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [refreshInterval] = useState(() => {
    const saved = localStorage.getItem('autoRefreshInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_AUTO_REFRESH_INTERVAL;
  });
  const [countdownResetToken, setCountdownResetToken] = useState(0);
  const currentPageRef = useRef(currentPage);
  
  // Keep refs for filter values so auto-refresh can use latest values
  const filtersRef = useRef({ searchQuery, selectedRegion, selectedGameType, selectedCategory, selectedContinent, selectedGeoRegion, selectedCountry, perPage });
  
  // Keep refs in sync with current values
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  
  useEffect(() => {
    filtersRef.current = { searchQuery, selectedRegion, selectedGameType, selectedCategory, selectedContinent, selectedGeoRegion, selectedCountry, perPage };
  }, [searchQuery, selectedRegion, selectedGameType, selectedCategory, selectedContinent, selectedGeoRegion, selectedCountry, perPage]);

  const handleAutoRefresh = useCallback(() => {
    const currentFilters = filtersRef.current;
    void fetchServers(currentPageRef.current, {
      searchQuery: currentFilters.searchQuery,
      selectedCategory: currentFilters.selectedCategory,
      selectedRegion: currentFilters.selectedRegion,
      selectedGameType: currentFilters.selectedGameType,
      selectedContinent: currentFilters.selectedContinent,
      selectedGeoRegion: currentFilters.selectedGeoRegion,
      selectedCountry: currentFilters.selectedCountry,
      perPage: currentFilters.perPage,
    }, { silent: true });
    void fetchStats();
  }, [fetchServers, fetchStats]);

  // Initial data fetch
  useEffect(() => {
    fetchServers(1);
    fetchStats();
    fetchMetadata();
  }, [fetchServers, fetchStats, fetchMetadata]);

  // Refetch when filters or perPage change (reset to page 1 for filter changes)
  // Filter changes are always manual, so show loading overlay
  // Pass new filter values directly to avoid race conditions with stale state
  const filterDepsRef = useRef({ searchQuery, selectedRegion, selectedGameType, selectedCategory, selectedContinent, selectedGeoRegion, selectedCountry, perPage });
  useEffect(() => {
    const prev = filterDepsRef.current;
    const changed = prev.searchQuery !== searchQuery || 
                   prev.selectedRegion !== selectedRegion || 
                   prev.selectedGameType !== selectedGameType ||
                   prev.selectedCategory !== selectedCategory || 
                   prev.selectedContinent !== selectedContinent ||
                   prev.selectedGeoRegion !== selectedGeoRegion ||
                   prev.selectedCountry !== selectedCountry ||
                   prev.perPage !== perPage;
    
    // Reload metadata when region/game/category changes
    const metadataChanged = prev.selectedRegion !== selectedRegion ||
                           prev.selectedGameType !== selectedGameType ||
                           prev.selectedCategory !== selectedCategory;
    
    if (changed) {
      // Filter changes are always user-initiated, so show loading overlay
      setIsManualRefresh(true);
      // Pass the NEW filter values directly to avoid race conditions
      // This ensures fetchServers uses the values that triggered this effect
      fetchServers(1, {
        searchQuery,
        selectedCategory,
        selectedRegion,
        selectedGameType,
        selectedContinent,
        selectedGeoRegion,
        selectedCountry,
        perPage,
      });
      setCountdownResetToken(token => token + 1);
      
      if (metadataChanged) {
        fetchMetadata();
      }
    }
    
    filterDepsRef.current = { searchQuery, selectedRegion, selectedGameType, selectedCategory, selectedContinent, selectedGeoRegion, selectedCountry, perPage };
  }, [searchQuery, selectedRegion, selectedGameType, selectedCategory, selectedContinent, selectedGeoRegion, selectedCountry, perPage, fetchServers, fetchMetadata]);

  const handleRefresh = () => {
    clearResponseCache(); // Bust cache so manual refresh always fetches fresh data
    setIsManualRefresh(true);
    if (showFavoritesOnly) {
      fetchFavServers();
    } else {
      fetchServers(currentPage); // Preserve current page on manual refresh
    }
    fetchStats();
    setCountdownResetToken(token => token + 1);
  };
  
  // Reset isManualRefresh when loading completes
  useEffect(() => {
    if (!isLoading && !favLoading && isManualRefresh) {
      const timer = window.setTimeout(() => setIsManualRefresh(false), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isLoading, favLoading, isManualRefresh]);


  return {
    refreshInterval,
    countdownResetToken,
    isManualRefresh,
    handleAutoRefresh,
    handleRefresh,
  };
}
