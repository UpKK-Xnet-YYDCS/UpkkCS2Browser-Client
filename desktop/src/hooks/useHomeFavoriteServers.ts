import { useCallback, useEffect, useRef } from 'react';
import { useHomeFavoriteIO } from '@/hooks/useHomeFavoriteIO';
import { useHomeFavoriteLatency } from '@/hooks/useHomeFavoriteLatency';
import { useHomeFavoriteQuery } from '@/hooks/useHomeFavoriteQuery';
import { useHomeFavoriteView } from '@/hooks/useHomeFavoriteView';
import { useI18n } from '@/hooks/useI18n';
import { useLocalLatencyQueue } from '@/hooks/useLocalLatencyQueue';
import { resolveVisibleFavoriteReorder, swapFavoriteServers } from '@/hooks/homeFavoriteReorder';
import { favoritePageItemIndex } from '@/services/favoritePagination';
import type { ServerStatus } from '@/types';

interface UseHomeFavoriteServersOptions {
  favorites: string[];
  servers: ServerStatus[];
  perPage: number;
  reorderFavorites: (from: number, to: number) => void;
  importFavorites: (addresses: string[]) => void;
  removeFavorite: (address: string) => void;
}

export function useHomeFavoriteServers({
  favorites,
  servers,
  perPage,
  reorderFavorites,
  importFavorites,
  removeFavorite,
}: UseHomeFavoriteServersOptions) {
  const { t } = useI18n();
  const {
    latencyStore,
    latencyDetectionSettings,
    latencySchedulerOptions,
    measureServers,
    seedMeasuredServers,
  } = useLocalLatencyQueue('HomePage');
  const {
    showFavoritesOnly,
    setShowFavoritesOnly,
    favServers,
    setFavServers,
    favLoading,
    fetchFavServers,
  } = useHomeFavoriteQuery({
    favorites,
    latencySchedulerOptions,
  });
  const {
    favPage,
    setFavPage,
    favSearchQuery,
    setFavSearchQuery,
    showOfflineServers,
    setShowOfflineServers,
    favGameFilter,
    setFavGameFilter,
    showAllGameTags,
    setShowAllGameTags,
    latencyFilter,
    setLatencyFilter,
    favGameNames,
    filteredFavServers,
    latencyFilteredFavServers,
    favTotalPages,
    displayedServers,
    displayedServersWithLatency,
  } = useHomeFavoriteView({
    favServers,
    servers,
    perPage,
    showFavoritesOnly,
    latencyStore,
  });
  const shouldBackfillLatency = latencyDetectionSettings.deepScanEnabled || latencyFilter !== 'all';

  // Latest fetcher for the toggle effect below; its identity changes with every
  // favorites array, which must not re-trigger the toggle-on reset.
  const fetchFavServersRef = useRef(fetchFavServers);
  useEffect(() => {
    fetchFavServersRef.current = fetchFavServers;
  }, [fetchFavServers]);

  // When showFavoritesOnly is toggled on, fetch favorites via A2S; reset page
  useEffect(() => {
    if (showFavoritesOnly) {
      const timer = window.setTimeout(() => {
        setFavPage(1);
        setFavGameFilter('');
        void fetchFavServersRef.current();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [showFavoritesOnly, setFavPage, setFavGameFilter]);

  useHomeFavoriteLatency({
    displayedServers,
    filteredFavServers,
    servers,
    showFavoritesOnly,
    favLoading,
    shouldBackfillLatency,
    latencySchedulerOptions,
    measureServers,
    seedMeasuredServers,
  });

  const handleLocalReorder = useCallback((index: number, direction: 'up' | 'down') => {
    // `index` is on the filtered, paginated list; swap by address, not position.
    const visibleIndex = favoritePageItemIndex(favPage, perPage, index);
    const move = resolveVisibleFavoriteReorder(latencyFilteredFavServers, visibleIndex, direction, favorites);
    if (!move) return;
    reorderFavorites(move.from, move.to);
    // Also swap in the local favServers state so UI updates instantly
    setFavServers(prev => swapFavoriteServers(prev, move.source, move.neighbour) ?? prev);
  }, [favPage, perPage, latencyFilteredFavServers, favorites, reorderFavorites, setFavServers]);

  const {
    handleExportFavorites,
    handleImportFavorites,
    handleClearOffline,
  } = useHomeFavoriteIO({
    favorites,
    favServers,
    showFavoritesOnly,
    t,
    importFavorites,
    removeFavorite,
    fetchFavServers,
    setFavServers,
  });

  return {
    showFavoritesOnly,
    setShowFavoritesOnly,
    favServers,
    favLoading,
    favPage,
    setFavPage,
    favSearchQuery,
    setFavSearchQuery,
    showOfflineServers,
    setShowOfflineServers,
    favGameFilter,
    setFavGameFilter,
    showAllGameTags,
    setShowAllGameTags,
    latencyFilter,
    setLatencyFilter,
    shouldBackfillLatency,
    latencySchedulerOptions,
    measureServers,
    favGameNames,
    filteredFavServers,
    latencyFilteredFavServers,
    favTotalPages,
    displayedServers,
    displayedServersWithLatency,
    fetchFavServers,
    handleLocalReorder,
    handleExportFavorites,
    handleImportFavorites,
    handleClearOffline,
  };
}
