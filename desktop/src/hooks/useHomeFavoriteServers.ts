import { useCallback, useEffect } from 'react';
import { useHomeFavoriteIO } from '@/hooks/useHomeFavoriteIO';
import { useHomeFavoriteLatency } from '@/hooks/useHomeFavoriteLatency';
import { useHomeFavoriteQuery } from '@/hooks/useHomeFavoriteQuery';
import { useHomeFavoriteView } from '@/hooks/useHomeFavoriteView';
import { useI18n } from '@/hooks/useI18n';
import { useLocalLatencyQueue } from '@/hooks/useLocalLatencyQueue';
import {
  favoritePageItemIndex,
  favoriteReorderTargetIndex,
  swapFavoriteOrder,
} from '@/services/favoritePagination';
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
    latencyByKey,
    latencyDetectionSettings,
    latencySchedulerOptions,
    measureServers,
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
    latencyByKey,
  });
  const shouldBackfillLatency = latencyDetectionSettings.deepScanEnabled || latencyFilter !== 'all';

  // When showFavoritesOnly is toggled on, fetch favorites via A2S; reset page
  useEffect(() => {
    if (showFavoritesOnly) {
      const timer = window.setTimeout(() => {
        setFavPage(1);
        setFavGameFilter('');
        void fetchFavServers();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [showFavoritesOnly, fetchFavServers, setFavPage, setFavGameFilter]);

  useHomeFavoriteLatency({
    displayedServers,
    filteredFavServers,
    servers,
    showFavoritesOnly,
    shouldBackfillLatency,
    latencySchedulerOptions,
    measureServers,
  });

  const handleLocalReorder = useCallback((index: number, direction: 'up' | 'down') => {
    const globalIndex = favoritePageItemIndex(favPage, perPage, index);
    const swapIndex = favoriteReorderTargetIndex(globalIndex, direction, favorites.length);
    if (swapIndex === null) return;
    reorderFavorites(globalIndex, swapIndex);
    // Also swap in the local favServers state so UI updates instantly
    setFavServers(prev => swapFavoriteOrder(prev, globalIndex, direction) ?? prev);
  }, [favPage, perPage, favorites.length, reorderFavorites, setFavServers]);

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
