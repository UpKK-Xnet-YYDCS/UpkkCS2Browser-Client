import { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as api from '@/api';
import { clearResponseCache } from '@/api';
import type { FavoriteServer } from '@/api';
import type { ServerStatus } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { rgbaToCss } from '@/store/themeUtils';
import { useI18n } from '@/hooks/useI18n';
import { ServerCard } from '@/components/ServerCard';
import { ServerListItem } from '@/components/ServerListItem';
import { CloudLoginPanel } from '@/components/CloudLoginPanel';
import { LatencyFilter, type LatencyFilterValue } from '@/components/LatencyFilter';
import { ViewModeSwitch } from '@/components/ViewModeSwitch';
import type { ViewMode } from '@/components/ViewModeSwitch';
import {
  applyLatencySnapshot,
  getServerLatencyTarget,
  matchesLatencyFilter,
} from '@/services/latencyDisplay';
import { useLocalLatencyQueue } from '@/hooks/useLocalLatencyQueue';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import {
  AddFavoriteModal,
  CountdownProgressBar,
  LogoutIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  StarFilledIcon,
} from '@/components/favorites/FavoritePageControls';
import { favoriteToServerStatus } from '@/services/favoriteServer';

// Default auto-refresh interval in seconds (same as server list)
const DEFAULT_AUTO_REFRESH_INTERVAL = 60;
const ServerDetailModal = lazy(() => import('@/components/ServerDetailModal').then(module => ({ default: module.ServerDetailModal })));
// Delay after favorite toggle before refreshing list (ms)
const FAVORITE_SYNC_DELAY_MS = 500;
// Items per page options
const PAGE_SIZE_OPTIONS = [12, 24, 48];
export function FavoritesPage() {
  const theme = useTheme();
  const { t } = useI18n();
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
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('favoritesPerPage');
    return saved ? parseInt(saved, 10) : PAGE_SIZE_OPTIONS[0];
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('favoritesViewMode');
    return (saved === 'list' ? 'list' : 'card') as ViewMode;
  });

  // Auto-refresh countdown (same pattern as HomePage)
  const [refreshInterval] = useState(() => {
    const saved = localStorage.getItem('autoRefreshInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_AUTO_REFRESH_INTERVAL;
  });
  const [countdown, setCountdown] = useState(refreshInterval);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetSignalRef = useRef(0);

  const primaryColor = rgbaToCss(theme.colorRegions.primary);
  const textColor = rgbaToCss(theme.colorRegions.text);

  // Load favorites
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
      const result = await api.getAllFavorites();
      if (result.favorites && Array.isArray(result.favorites)) {
        setFavorites(result.favorites);
        setTotalFavorites(result.total);
      }
    } catch (err) {
      console.error('[Favorites] Failed to load favorites:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('401') || errMsg.includes('Not logged in')) {
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

  // Auto-refresh with countdown (same pattern as HomePage)
  useEffect(() => {
    if (!authStatus.logged_in || refreshInterval <= 0) return;

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    let lastResetSignal = resetSignalRef.current;

    countdownRef.current = setInterval(() => {
      if (resetSignalRef.current !== lastResetSignal) {
        lastResetSignal = resetSignalRef.current;
        setCountdown(refreshInterval);
        return;
      }

      setCountdown(prev => {
        if (prev <= 1) {
          clearResponseCache(); // Bust cache so auto-refresh fetches fresh data
          loadFavorites();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [refreshInterval, authStatus.logged_in, loadFavorites]);

  // Callback for when a favorite is added/removed via ServerCard star button
  const handleFavoriteChange = useCallback(() => {
    setTimeout(() => loadFavorites(), FAVORITE_SYNC_DELAY_MS);
  }, [loadFavorites]);

  // Manual refresh
  const handleRefresh = () => {
    clearResponseCache(); // Bust cache so manual refresh always fetches fresh data
    loadFavorites(true);
    resetSignalRef.current += 1;
  };

  // Reorder favorites
  const handleReorder = async (sourceIndex: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? sourceIndex - 1 : sourceIndex + 1;
    if (swapIndex < 0 || swapIndex >= favorites.length) return;

    const newFavorites = [...favorites];
    [newFavorites[sourceIndex], newFavorites[swapIndex]] = [newFavorites[swapIndex], newFavorites[sourceIndex]];
    setFavorites(newFavorites);

    // Persist sort order to backend
    const orders = newFavorites.map((fav, i) => ({
      server_ip: fav.server_ip,
      server_port: fav.server_port,
      sort_order: i,
    }));
    api.updateFavoriteSortOrder(orders).catch(err => {
      console.error('[Favorites] Failed to update sort order:', err);
    });
  };

  // Change page size
  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size);
    localStorage.setItem('favoritesPerPage', String(size));
    setCurrentPage(1);
  };

  // Change view mode
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('favoritesViewMode', mode);
  };

  // Logout
  const handleLogout = async () => {
    await logout();
    setFavorites([]);
  };

  const favoriteRows = useMemo(() => {
    return favorites.map((fav, sourceIndex) => ({
      fav,
      sourceIndex,
      server: favoriteToServerStatus(fav),
    }));
  }, [favorites]);

  // Client-side search filtering
  const searchedFavoriteRows = useMemo(() => {
    if (!searchQuery.trim()) return favoriteRows;
    const q = searchQuery.toLowerCase();
    return favoriteRows.filter(({ fav }) => {
      const name = (fav.current_name || fav.server_name || '').toLowerCase();
      const addr = `${fav.server_ip}:${fav.server_port}`.toLowerCase();
      const map = (fav.map_name || '').toLowerCase();
      const category = (fav.category || '').toLowerCase();
      return name.includes(q) || addr.includes(q) || map.includes(q) || category.includes(q);
    });
  }, [favoriteRows, searchQuery]);

  const filteredFavoriteRows = useMemo(() => {
    return searchedFavoriteRows
      .map(row => {
        const target = getServerLatencyTarget(row.server);
        const server = target ? applyLatencySnapshot(row.server, latencyByKey[target.key]) : row.server;
        return { ...row, server };
      })
      .filter(row => matchesLatencyFilter(row.server, latencyFilter));
  }, [searchedFavoriteRows, latencyByKey, latencyFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFavoriteRows.length / itemsPerPage));
  const paginatedFavoriteRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFavoriteRows.slice(start, start + itemsPerPage);
  }, [filteredFavoriteRows, currentPage, itemsPerPage]);

  useEffect(() => {
    if (!authStatus.logged_in) return undefined;
    return measureServers(paginatedFavoriteRows.map(row => row.server));
  }, [authStatus.logged_in, paginatedFavoriteRows, latencySchedulerOptions, measureServers]);

  useEffect(() => {
    if (!authStatus.logged_in || !latencyDetectionSettings.deepScanEnabled) return undefined;
    return measureServers(searchedFavoriteRows.map(row => row.server), {
      mode: 'background',
      excludeServers: paginatedFavoriteRows.map(row => row.server),
    });
  }, [
    authStatus.logged_in,
    latencyDetectionSettings.deepScanEnabled,
    searchedFavoriteRows,
    paginatedFavoriteRows,
    latencySchedulerOptions,
    measureServers,
  ]);

  // Reset to page 1 when search changes
  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [searchQuery, latencyFilter]);

  // Clamp currentPage to valid range when favorites list shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      const timer = window.setTimeout(() => setCurrentPage(Math.max(1, totalPages)), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentPage, totalPages]);

  // Not logged in - show login prompt with multiple providers
  if (!authStatus.logged_in) {
    return (
      <CloudLoginPanel
        icon={<StarFilledIcon />}
        title={t.cloudFavorites}
        description={t.cloudFavoritesDesc}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          {/* Row 1: Header + User info */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <StarFilledIcon />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: textColor }}>
                  {t.myFavorites}
                </h1>
                <p className="text-xs text-gray-500">
                  {authStatus.user?.username && `${t.welcome}, ${authStatus.user.username}`}
                  {filteredFavoriteRows.length > 0 && ` · ${filteredFavoriteRows.length} ${t.favorites}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-sm transition-colors"
              title={t.logout}
            >
              <LogoutIcon />
              <span>{t.logout}</span>
            </button>
          </div>
          {/* Row 2: Search + Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchFavorites}
                className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-transparent hover:bg-gray-200/80 dark:hover:bg-gray-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-500/20 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Countdown progress bar */}
            {refreshInterval > 0 && (
              <CountdownProgressBar 
                secondsRemaining={countdown} 
                totalSeconds={refreshInterval}
                isLoading={isLoading && isManualRefresh}
              />
            )}
            {/* View mode switch */}
            <ViewModeSwitch viewMode={viewMode} onViewModeChange={handleViewModeChange} />
            <LatencyFilter
              value={latencyFilter}
              onChange={setLatencyFilter}
              label={t.latencyLimit}
              allLabel={t.latencyFilterAll}
              unknownLabel={t.latencyFilterUnknown}
            />
            {/* Add favorite button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
              title={t.addFavoriteTitle}
            >
              <PlusIcon />
            </button>
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
              title={t.refresh}
            >
              <RefreshIcon spinning={isLoading && isManualRefresh} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Error state */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-red-700 dark:text-red-400">{error}</p>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && favorites.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && favorites.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: textColor }}>
                  {t.noFavorites}
                </h3>
                <p className="text-gray-500 mb-4">
                  {t.noFavoritesHint}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium transition-colors hover:from-green-600 hover:to-emerald-600"
                >
                  {t.addFavoriteTitle}
                </button>
              </div>
            </div>
          )}

          {/* Favorites grid */}
          {paginatedFavoriteRows.length > 0 && (
            <div className="relative">
              {/* Loading overlay for manual refresh */}
              {isLoading && isManualRefresh && (
                <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] flex items-start justify-center pt-20 z-10 rounded-xl transition-opacity">
                  <div className="flex flex-col items-center gap-3 bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="w-10 h-10 border-3 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t.loadingFavorites}</span>
                  </div>
                </div>
              )}

              {/* Top pagination and page size */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {t.favorites}: {filteredFavoriteRows.length}
                  {searchQuery && ` / ${totalFavorites}`}
                </p>
                <div className="flex items-center gap-3">
                  {/* Page size selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">{t.itemsPerPage}</span>
                    <select
                      value={itemsPerPage}
                      onChange={e => handlePageSizeChange(Number(e.target.value))}
                      className="text-sm px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border-0 text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        ‹
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedFavoriteRows.map(({ fav, server, sourceIndex }) => {
                  const serverStatus = server;
                  return (
                    <div key={`${fav.server_ip}:${fav.server_port}`} className="relative group">
                      <ServerCard
                        server={serverStatus}
                        onSelect={handleSelectServer}
                        onFavoriteChange={handleFavoriteChange}
                        hideCloudFavorite
                      />
                      {/* Reorder buttons */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(sourceIndex, 'up'); }}
                          disabled={sourceIndex === 0}
                          className="p-1 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                          title={t.moveUp}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(sourceIndex, 'down'); }}
                          disabled={sourceIndex >= favorites.length - 1}
                          className="p-1 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                          title={t.moveDown}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : (
              <div className="space-y-2">
                {paginatedFavoriteRows.map(({ fav, server, sourceIndex }) => {
                  const serverStatus = server;
                  return (
                    <div key={`${fav.server_ip}:${fav.server_port}`} className="relative group">
                      {/* Reorder buttons for list view - positioned at left to avoid blocking join button */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(sourceIndex, 'up'); }}
                          disabled={sourceIndex === 0}
                          className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                          title={t.moveUp}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(sourceIndex, 'down'); }}
                          disabled={sourceIndex >= favorites.length - 1}
                          className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                          title={t.moveDown}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      <ServerListItem
                        server={serverStatus}
                        onSelect={handleSelectServer}
                      />
                    </div>
                  );
                })}
              </div>
              )}

              {/* Bottom pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          page === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search or latency filter returned no results */}
          {!isLoading && filteredFavoriteRows.length === 0 && favorites.length > 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-gray-500">{t.noServersFound}</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setLatencyFilter('all');
                  }}
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  {t.showAllServers}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedServer && (
        <Suspense fallback={null}>
          <ServerDetailModal
            server={selectedServer}
            onClose={() => setSelectedServer(null)}
            isCloudFavorite={true}
            onFavoriteRemoved={() => { setSelectedServer(null); loadFavorites(); }}
          />
        </Suspense>
      )}

      {showAddModal && (
        <AddFavoriteModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { loadFavorites(); resetSignalRef.current += 1; }}
        />
      )}
    </div>
  );
}
