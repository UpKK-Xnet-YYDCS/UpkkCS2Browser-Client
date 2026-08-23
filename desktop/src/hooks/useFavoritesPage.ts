import { useCallback, useEffect, useState } from 'react';
import { getAllFavorites, updateFavoriteSortOrder, type FavoriteServer } from '@/api/favorites';
import type { LatencyFilterValue, ViewMode } from '@/types/ui';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useFavoritesAutoRefresh } from '@/hooks/useFavoritesAutoRefresh';
import { useLocalLatencyQueue } from '@/hooks/useLocalLatencyQueue';
import { useFavoritesPageView } from '@/hooks/useFavoritesPageView';
import {
  AUTO_REFRESH_INTERVAL_KEY,
  FAVORITES_PAGE_SIZE_KEY,
  FAVORITES_VIEW_MODE_KEY,
  favoriteSortOrders,
  readAutoRefreshInterval,
  readFavoritesPageSize,
  readFavoritesViewMode,
  swapFavoriteOrder,
  isFavoritesAuthError,
} from '@/services/favoritesPageQuery';
import type { ServerStatus } from '@/types';

export { FAVORITES_PAGE_SIZE_OPTIONS, type FavoriteRow } from '@/services/favoritesPageQuery';

const FAVORITE_SYNC_DELAY_MS = 500;

export function useFavoritesPage() {
  const { authStatus, logout, invalidate } = useCloudAuth();
  const [favorites, setFavorites] = useState<FavoriteServer[]>([]);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerStatus | null>(null);
  const handleSelectServer = useCallback((server: ServerStatus) => setSelectedServer(server), []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [latencyFilter, setLatencyFilter] = useState<LatencyFilterValue>('all');
  const {
    latencyByKey,
    latencyDetectionSettings,
    latencySchedulerOptions,
    measureServers,
  } = useLocalLatencyQueue('Favorites');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => readFavoritesPageSize(localStorage.getItem(FAVORITES_PAGE_SIZE_KEY)));
  const [viewMode, setViewMode] = useState<ViewMode>(() => readFavoritesViewMode(localStorage.getItem(FAVORITES_VIEW_MODE_KEY)));
  const [refreshInterval] = useState(() => readAutoRefreshInterval(localStorage.getItem(AUTO_REFRESH_INTERVAL_KEY)));

  const loadFavorites = useCallback(async (showLoadingOverlay = false) => {
    if (!authStatus.logged_in) {
      setIsLoading(false);
      return;
    }

    if (showLoadingOverlay) {
      setIsManualRefresh(true);
    }
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllFavorites();
      if (result.favorites && Array.isArray(result.favorites)) {
        setFavorites(result.favorites);
        setTotalFavorites(result.total);
      }
    } catch (err) {
      console.error('[Favorites] Failed to load favorites:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (isFavoritesAuthError(errMsg)) {
        void invalidate();
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [authStatus.logged_in, invalidate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFavorites();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFavorites]);

  const { countdown, handleRefresh, bumpRefreshSignal } = useFavoritesAutoRefresh({
    loggedIn: authStatus.logged_in,
    refreshInterval,
    loadFavorites,
  });

  const handleFavoriteChange = useCallback(() => {
    setTimeout(() => loadFavorites(), FAVORITE_SYNC_DELAY_MS);
  }, [loadFavorites]);

  const handleReorder = async (sourceIndex: number, direction: 'up' | 'down') => {
    const next = swapFavoriteOrder(favorites, sourceIndex, direction);
    if (!next) return;
    setFavorites(next);
    updateFavoriteSortOrder(favoriteSortOrders(next)).catch(err => {
      console.error('[Favorites] Failed to update sort order:', err);
    });
  };

  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size);
    localStorage.setItem(FAVORITES_PAGE_SIZE_KEY, String(size));
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(FAVORITES_VIEW_MODE_KEY, mode);
  };

  const handleLogout = async () => {
    await logout();
    setFavorites([]);
  };

  const {
    filteredFavoriteRows,
    paginatedFavoriteRows,
    totalPages,
  } = useFavoritesPageView({
    favorites,
    searchQuery,
    latencyFilter,
    latencyByKey,
    currentPage,
    itemsPerPage,
    loggedIn: authStatus.logged_in,
    deepScanEnabled: latencyDetectionSettings.deepScanEnabled,
    latencySchedulerOptions,
    measureServers,
    setCurrentPage,
  });

  return {
    authStatus,
    favorites,
    totalFavorites,
    isLoading,
    isManualRefresh,
    error,
    setError,
    selectedServer,
    setSelectedServer,
    handleSelectServer,
    showAddModal,
    setShowAddModal,
    searchQuery,
    setSearchQuery,
    latencyFilter,
    setLatencyFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    viewMode,
    refreshInterval,
    countdown,
    loadFavorites,
    handleFavoriteChange,
    handleRefresh,
    handleReorder,
    handlePageSizeChange,
    handleViewModeChange,
    handleLogout,
    filteredFavoriteRows,
    paginatedFavoriteRows,
    totalPages,
    bumpRefreshSignal,
  };
}
