import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAppStore } from '@/store';
import { useI18n } from '@/store/i18n';
import { 
  ServerCard, 
  ServerListItem,
  ServerDetailModal,
  AddServerModal,
  ServerCardSkeleton,
  ServerListItemSkeleton,
  SearchBar, 
  RegionFilter,
  GameTypeFilter,
  CategoryFilter,
  FavoriteFilter,
  Pagination,
  TopPagination,
  StatsBar,
  ViewModeSwitch,
} from '@/components';
import type { ServerStatus } from '@/types';
import { parseServerAddress, queryServerA2S, isTauriAvailable } from '@/services/a2s';
import { showToast } from '@/components/ToastNotification';

/** Check if a server is considered online (has game, players capacity, or Online flag) */
function isServerOnline(s: ServerStatus): boolean {
  return Boolean(s.game) || (s.max_players ?? 0) > 0 || s.Online === true;
}

// Default auto-refresh interval in seconds
const DEFAULT_AUTO_REFRESH_INTERVAL = 60;

// Refresh icon
const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg 
    className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Add server icon
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Countdown Progress Bar Component
interface CountdownProgressBarProps {
  secondsRemaining: number;
  totalSeconds: number;
  isLoading?: boolean;
}

const CountdownProgressBar = ({ secondsRemaining, totalSeconds, isLoading }: CountdownProgressBarProps) => {
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50 min-w-[120px]">
      <div className="flex-1 relative">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              isLoading 
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse w-full' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
            }`}
            style={{ width: isLoading ? '100%' : `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 min-w-[28px] text-right tabular-nums">
        {isLoading ? '...' : `${secondsRemaining}s`}
      </span>
    </div>
  );
};

// Search icon for local favorites
const SearchIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// Default game server port
const DEFAULT_LOCAL_SERVER_PORT = '27015';
// Maximum visible game tags before showing expand button
const MAX_VISIBLE_GAME_TAGS = 6;

// Add Local Server Modal
function AddLocalServerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (addr: string) => void }) {
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;

    const parsed = parseServerAddress(trimmed.includes(':') ? trimmed : `${trimmed}:${DEFAULT_LOCAL_SERVER_PORT}`);
    if (!parsed) {
      setError(t.invalidAddressFormat);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Query A2S to validate the server is reachable
      const result = await queryServerA2S(parsed.ip, parsed.port);
      if (!result.success) {
        setError(result.error || 'Failed to query server');
        return;
      }

      const addr = `${parsed.ip}:${parsed.port}`;
      onAdded(addr);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.addLocalServer}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">{t.addLocalServerDesc}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.serverAddress}</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="192.168.1.1:27015 / example.com:27015"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!address.trim() || isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? '...' : t.addLocalServer}
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium rounded-xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const { 
    servers, 
    isLoading, 
    error, 
    fetchServers, 
    fetchStats,
    clearError,
    searchQuery,
    selectedRegion,
    selectedGameType,
    selectedCategory,
    viewMode,
    setViewMode,
    perPage,
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    reorderFavorites,
    importFavorites,
    currentPage,
  } = useAppStore();
  const { t } = useI18n();

  const [selectedServer, setSelectedServer] = useState<ServerStatus | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showAddLocalServerModal, setShowAddLocalServerModal] = useState(false);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  
  // Local favorites state: A2S-queried server data and client-side pagination
  const [favServers, setFavServers] = useState<ServerStatus[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [favPage, setFavPage] = useState(1);
  const [favSearchQuery, setFavSearchQuery] = useState('');
  const [showOfflineServers, setShowOfflineServers] = useState(false);
  const [favGameFilter, setFavGameFilter] = useState('');
  const [showAllGameTags, setShowAllGameTags] = useState(false);

  // Auto-refresh countdown state - initialize with value from localStorage or default
  // Using useState with lazy initializer for proper one-time initialization
  const [refreshInterval] = useState(() => {
    const saved = localStorage.getItem('autoRefreshInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_AUTO_REFRESH_INTERVAL;
  });
  const [countdown, setCountdown] = useState(() => {
    const saved = localStorage.getItem('autoRefreshInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_AUTO_REFRESH_INTERVAL;
  });
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPageRef = useRef(currentPage);
  const resetSignalRef = useRef(0); // Increment to signal countdown reset
  
  // Keep refs for filter values so auto-refresh can use latest values
  const filtersRef = useRef({ searchQuery, selectedRegion, selectedGameType, selectedCategory, perPage });
  
  // Keep refs in sync with current values
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  
  useEffect(() => {
    filtersRef.current = { searchQuery, selectedRegion, selectedGameType, selectedCategory, perPage };
  }, [searchQuery, selectedRegion, selectedGameType, selectedCategory, perPage]);

  // Fetch local favorite servers via A2S queries
  // Phase 1: Instantly show all favorites as placeholders (IP visible immediately)
  // Phase 2: Query each server asynchronously, update in-place as results arrive
  const fetchFavServers = useCallback(async () => {
    if (favorites.length === 0) {
      setFavServers([]);
      return;
    }
    setFavLoading(true);

    // Helper to build a placeholder entry (shown as [Offline] - ip:port)
    const makePlaceholder = (ip: string, port: string): ServerStatus => ({
      name: '', ip, port, game: '', region: '', mode: '',
      players: 0, max_players: 0, bots: 0, real_players: 0, map_name: '',
      comments: '', display_address: ip, mapnamecn: '', category: '',
      priority: 0, config_order: 0, admin_sort_priority: 0, submitter_uid: 0,
      country_code: '', country_name: '', server_type: '', environment: '',
      vac: false, password: false, version: '', game_id: 0,
      last_updated: new Date().toISOString(), Online: false,
    });

    // Phase 1: Parse all addresses and show them immediately as placeholders
    const parsedList = favorites.map(addr => ({ addr, parsed: parseServerAddress(addr) }));
    const initialList = parsedList
      .filter(e => e.parsed !== null)
      .map(e => makePlaceholder(e.parsed!.ip, e.parsed!.port));
    setFavServers(initialList);

    // Phase 2: Query servers using 3 concurrent workers with non-overlapping assignments
    try {
      const QUERY_TIMEOUT_MS = 5000;
      const CONCURRENCY = 3;
      const validParsed = parsedList.filter(e => e.parsed !== null).map(e => e.parsed!);
      let nextIndex = 0;

      const worker = async () => {
        while (true) {
          const idx = nextIndex++;
          if (idx >= validParsed.length) break;
          const parsed = validParsed[idx];
          try {
            const a2s = await Promise.race([
              queryServerA2S(parsed.ip, parsed.port),
              new Promise<null>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), QUERY_TIMEOUT_MS)
              ),
            ]);
            if (a2s && a2s.success) {
              const server: ServerStatus = {
                name: a2s.name, ip: parsed.ip, port: parsed.port, game: a2s.game,
                region: '', mode: '', players: a2s.players, max_players: a2s.max_players,
                bots: a2s.bots, real_players: a2s.real_players, map_name: a2s.map_name,
                comments: '', display_address: parsed.ip, mapnamecn: '', category: '',
                priority: 0, config_order: 0, admin_sort_priority: 0, submitter_uid: 0,
                country_code: '', country_name: '', server_type: a2s.server_type,
                environment: a2s.environment, vac: a2s.vac, password: a2s.password,
                version: a2s.version, game_id: 0,
                last_updated: new Date().toISOString(), Online: true,
              };
              // Replace the placeholder in-place so the list order is preserved
              setFavServers(prev => prev.map(s =>
                s.ip === parsed.ip && s.port === parsed.port ? server : s
              ));
            }
          } catch {
            // Timed out or error — placeholder already shows as offline
          }
        }
      };

      await Promise.allSettled(Array.from({ length: CONCURRENCY }, () => worker()));
    } catch (err) {
      console.error('[HomePage] Failed to fetch favorite servers via A2S:', err);
    } finally {
      setFavLoading(false);
    }
  }, [favorites]);

  // When showFavoritesOnly is toggled on, fetch favorites via A2S; reset page
  useEffect(() => {
    if (showFavoritesOnly) {
      setFavPage(1);
      setFavGameFilter('');
      fetchFavServers();
    }
  }, [showFavoritesOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when favorites list content changes while in favorites-only mode
  // (e.g., after adding/removing a server via AddLocalServerModal)
  // Does NOT trigger on reorder (same set of addresses, different order)
  const prevFavoritesSetRef = useRef(new Set(favorites));
  useEffect(() => {
    if (!showFavoritesOnly) {
      prevFavoritesSetRef.current = new Set(favorites);
      return;
    }
    const currentSet = new Set(favorites);
    const prevSet = prevFavoritesSetRef.current;
    const changed = currentSet.size !== prevSet.size || [...currentSet].some(f => !prevSet.has(f));
    if (changed) {
      fetchFavServers();
    }
    prevFavoritesSetRef.current = currentSet;
  }, [favorites, showFavoritesOnly, fetchFavServers]);

  // Extract unique game names from local favorites for filter tags (only when >1 game)
  // Sort by server count descending, include count for display
  const favGameNames = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const s of favServers) {
      const game = s.game?.trim();
      if (game) countMap.set(game, (countMap.get(game) || 0) + 1);
    }
    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [favServers]);

  // Compute displayed servers and pagination for favorites-only mode
  // Apply local search filtering on favServers and offline filtering
  const filteredFavServers = useMemo(() => {
    let result = favServers;
    // Filter out offline servers unless showOfflineServers is enabled
    if (!showOfflineServers) {
      result = result.filter(s => isServerOnline(s));
    }
    // Game filter
    if (favGameFilter) {
      result = result.filter(s => (s.game?.trim() || '') === favGameFilter);
    }
    if (!favSearchQuery.trim()) return result;
    const q = favSearchQuery.toLowerCase();
    return result.filter(s => {
      const name = (s.name || '').toLowerCase();
      const addr = `${s.ip}:${s.port}`.toLowerCase();
      const map = (s.map_name || '').toLowerCase();
      const game = (s.game || '').toLowerCase();
      return name.includes(q) || addr.includes(q) || map.includes(q) || game.includes(q);
    });
  }, [favServers, favSearchQuery, showOfflineServers, favGameFilter]);

  const favTotalPages = Math.max(1, Math.ceil(filteredFavServers.length / perPage));

  // Clamp favPage to valid range when favorites list changes
  useEffect(() => {
    if (showFavoritesOnly && favPage > favTotalPages) {
      setFavPage(Math.max(1, favTotalPages));
    }
  }, [showFavoritesOnly, favPage, favTotalPages]);

  // Reset favPage when search query or game filter changes
  useEffect(() => {
    setFavPage(1);
  }, [favSearchQuery, favGameFilter]);

  const displayedServers = useMemo(() => {
    if (!showFavoritesOnly) return servers;
    const start = (favPage - 1) * perPage;
    return filteredFavServers.slice(start, start + perPage);
  }, [servers, showFavoritesOnly, filteredFavServers, favPage, perPage]);

  // Reorder local favorites
  const handleLocalReorder = useCallback((index: number, direction: 'up' | 'down') => {
    const globalIndex = (favPage - 1) * perPage + index;
    const swapIndex = direction === 'up' ? globalIndex - 1 : globalIndex + 1;
    if (swapIndex < 0 || swapIndex >= favorites.length) return;
    reorderFavorites(globalIndex, swapIndex);
    // Also swap in the local favServers state so UI updates instantly
    setFavServers(prev => {
      if (globalIndex >= prev.length || swapIndex >= prev.length) return prev;
      const updated = [...prev];
      [updated[globalIndex], updated[swapIndex]] = [updated[swapIndex], updated[globalIndex]];
      return updated;
    });
  }, [favPage, perPage, favorites.length, reorderFavorites]);

  // Auto-refresh with countdown - uses refs to get latest filter values
  useEffect(() => {
    if (refreshInterval <= 0) return;

    // Clear existing interval
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    let lastResetSignal = resetSignalRef.current;
    
    // Start countdown timer (updates every second)
    countdownRef.current = setInterval(() => {
      // Check if reset was signaled
      if (resetSignalRef.current !== lastResetSignal) {
        lastResetSignal = resetSignalRef.current;
        setCountdown(refreshInterval);
        return;
      }
      
      setCountdown(prev => {
        if (prev <= 1) {
          // Time to refresh - use refs to get latest values to avoid race conditions
          const currentFilters = filtersRef.current;
          fetchServers(currentPageRef.current, {
            searchQuery: currentFilters.searchQuery,
            selectedCategory: currentFilters.selectedCategory,
            selectedRegion: currentFilters.selectedRegion,
            selectedGameType: currentFilters.selectedGameType,
            perPage: currentFilters.perPage,
          });
          fetchStats();
          return refreshInterval; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [refreshInterval, fetchServers, fetchStats]);

  // Initial data fetch
  useEffect(() => {
    fetchServers(1);
    fetchStats();
  }, [fetchServers, fetchStats]);

  // Refetch when filters or perPage change (reset to page 1 for filter changes)
  // Filter changes are always manual, so show loading overlay
  // Pass new filter values directly to avoid race conditions with stale state
  const filterDepsRef = useRef({ searchQuery, selectedRegion, selectedGameType, selectedCategory, perPage });
  useEffect(() => {
    const prev = filterDepsRef.current;
    const changed = prev.searchQuery !== searchQuery || 
                   prev.selectedRegion !== selectedRegion || 
                   prev.selectedGameType !== selectedGameType ||
                   prev.selectedCategory !== selectedCategory || 
                   prev.perPage !== perPage;
    
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
        perPage,
      });
      // Signal countdown reset via ref (interval will pick this up)
      resetSignalRef.current += 1;
    }
    
    filterDepsRef.current = { searchQuery, selectedRegion, selectedGameType, selectedCategory, perPage };
  }, [searchQuery, selectedRegion, selectedGameType, selectedCategory, perPage, fetchServers]);

  const handleRefresh = () => {
    setIsManualRefresh(true);
    if (showFavoritesOnly) {
      fetchFavServers();
    } else {
      fetchServers(currentPage); // Preserve current page on manual refresh
    }
    fetchStats();
    // Signal countdown reset via ref (interval will pick this up)
    resetSignalRef.current += 1;
  };
  
  // Reset isManualRefresh when loading completes
  useEffect(() => {
    if (!isLoading && !favLoading && isManualRefresh) {
      setIsManualRefresh(false);
    }
  }, [isLoading, favLoading, isManualRefresh]);

  // Export local favorites to a JSON file
  const handleExportFavorites = useCallback(async () => {
    const filename = `xproj_favorites_${new Date().toISOString().slice(0, 10)}.json`;
    const data = JSON.stringify({ favorites, exportedAt: new Date().toISOString() }, null, 2);

    // In Tauri, use native save dialog to let user choose save location
    if (isTauriAvailable()) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { invoke } = await import('@tauri-apps/api/core');
        const filePath = await save({
          defaultPath: filename,
          filters: [{ name: 'JSON', extensions: ['json'] }],
          title: t.exportFavorites,
        });
        if (filePath) {
          await invoke('write_text_file', { path: filePath, contents: data });
          showToast(t.exportFavoritesSuccess + filePath, '', 'info', 5000);
        }
      } catch (err) {
        console.error('Export failed:', err);
        showToast(String(err), '', 'error', 5000);
      }
      return;
    }

    // Fallback: browser download
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t.exportFavoritesSuccess + filename, '', 'info', 5000);
  }, [favorites, t]);

  // Remove all offline servers from local favorites in one click
  const handleClearOffline = useCallback(() => {
    const offlineAddrs = favServers
      .filter(s => !isServerOnline(s))
      .map(s => `${s.ip}:${s.port}`);
    if (offlineAddrs.length === 0) return;
    for (const addr of offlineAddrs) {
      removeFavorite(addr);
    }
    setFavServers(prev => prev.filter(s => isServerOnline(s)));
  }, [favServers, removeFavorite]);

  // Import local favorites from a JSON file
  const handleImportFavorites = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const addrs: string[] = Array.isArray(data.favorites) ? data.favorites : Array.isArray(data) ? data : [];
        const valid = addrs.filter(a => typeof a === 'string' && parseServerAddress(a) !== null);
        if (valid.length > 0) {
          importFavorites(valid);
          if (showFavoritesOnly) fetchFavServers();
        }
      } catch {
        console.error('[HomePage] Failed to import favorites');
      }
    };
    input.click();
  }, [importFavorites, showFavoritesOnly, fetchFavServers]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          {/* Row 1: Game Type, Region, ViewMode, Stats */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <GameTypeFilter />
              <RegionFilter />
              <ViewModeSwitch viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
            <StatsBar />
          </div>
          {/* Row 2: Search bar + Favorites + Import/Export + Refresh controls */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {showFavoritesOnly ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    value={favSearchQuery}
                    onChange={e => setFavSearchQuery(e.target.value)}
                    placeholder={t.searchLocalFavorites}
                    className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-transparent hover:bg-gray-200/80 dark:hover:bg-gray-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-500/20 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 outline-none"
                  />
                  {favSearchQuery && (
                    <button
                      onClick={() => setFavSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <SearchBar />
              )}
            </div>
            <FavoriteFilter 
              showFavoritesOnly={showFavoritesOnly} 
              onToggle={setShowFavoritesOnly}
              favoriteCount={favorites.length}
            />
            {showFavoritesOnly && (
              <>
                <button
                  onClick={() => setShowOfflineServers(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    showOfflineServers
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={t.showOfflineServers}
                >
                  <span className={`w-2 h-2 rounded-full ${showOfflineServers ? 'bg-red-500' : 'bg-gray-400'}`} />
                  <span>{t.showOfflineServers}</span>
                </button>
                {showOfflineServers && favServers.some(s => !isServerOnline(s)) && (
                  <button
                    onClick={handleClearOffline}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-all"
                    title={t.clearOfflineServers}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span>{t.clearOfflineServers}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddLocalServerModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all shadow-md hover:shadow-lg"
                  title={t.addLocalServer}
                >
                  <PlusIcon />
                  <span>{t.addLocalServer}</span>
                </button>
                <button
                  onClick={handleExportFavorites}
                  disabled={favorites.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-all"
                  title={t.exportFavorites}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>{t.exportFavorites}</span>
                </button>
                <button
                  onClick={handleImportFavorites}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  title={t.importFavorites}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <span>{t.importFavorites}</span>
                </button>
              </>
            )}
            {refreshInterval > 0 && (
              <CountdownProgressBar 
                secondsRemaining={countdown} 
                totalSeconds={refreshInterval}
                isLoading={isLoading && isManualRefresh}
              />
            )}
            <button
              onClick={() => setShowAddServerModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
              title={t.addServer}
            >
              <PlusIcon />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
              title={t.refreshServerList}
            >
              <RefreshIcon spinning={isLoading && isManualRefresh} />
            </button>
          </div>
          {/* Row 3: Category filter */}
          <CategoryFilter />
          {/* Row 4: Game filter tags for local favorites (only when >1 unique game) */}
          {showFavoritesOnly && favGameNames.length > 1 && (
            <div className="relative">
              <div className={`flex items-center gap-2 flex-wrap pb-1 ${!showAllGameTags ? 'max-h-[4.5rem] overflow-hidden' : ''}`}>
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <button
                  onClick={() => setFavGameFilter('')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    favGameFilter === ''
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t.allGames}
                </button>
                {favGameNames.map(({ name, count }) => {
                  // Truncate game name to 32 bytes at valid character boundary
                  const encoder = new TextEncoder();
                  let displayName = name;
                  if (encoder.encode(name).length > 32) {
                    let end = name.length;
                    while (end > 0 && encoder.encode(name.slice(0, end)).length > 32) end--;
                    displayName = name.slice(0, end) + '…';
                  }
                  return (
                    <button
                      key={name}
                      onClick={() => setFavGameFilter(name)}
                      title={name}
                      className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                        favGameFilter === name
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {displayName}({count})
                    </button>
                  );
                })}
              </div>
              {favGameNames.length > MAX_VISIBLE_GAME_TAGS && (
                <button
                  onClick={() => setShowAllGameTags(!showAllGameTags)}
                  className="mt-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  {showAllGameTags ? '▲ ' + (t.collapse || '收起') : '▼ ' + (t.expand || '展开') + ` (${favGameNames.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 dark:text-red-400">{error}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Loading state - show skeleton cards */}
          {((isLoading && servers.length === 0 && !showFavoritesOnly) || (favLoading && favServers.length === 0 && showFavoritesOnly)) && (
            <div>
              {/* Top pagination skeleton */}
              <div className="mb-4 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <ServerCardSkeleton key={index} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <ServerListItemSkeleton key={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && servers.length === 0 && !error && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.noServersFound}</h3>
                <p className="text-gray-500 dark:text-gray-400">{t.noServersHint}</p>
              </div>
            </div>
          )}

          {/* Favorites only empty state */}
          {!favLoading && showFavoritesOnly && displayedServers.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.noFavoriteServers}</h3>
                <p className="text-gray-500 dark:text-gray-400">{t.noFavoriteServersHint}</p>
                <button
                  onClick={() => setShowFavoritesOnly(false)}
                  className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t.showAllServers}
                </button>
              </div>
            </div>
          )}

          {/* Server display - Card or List view */}
          {displayedServers.length > 0 && (
            <div className="relative">
              {/* Loading overlay for manual refresh only - not shown for local favorites */}
              {isLoading && !showFavoritesOnly && isManualRefresh && (
                <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] flex items-start justify-center pt-20 z-10 rounded-xl transition-opacity">
                  <div className="flex flex-col items-center gap-3 bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="w-10 h-10 border-3 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t.loadingServers}</span>
                  </div>
                </div>
              )}
              
              {/* Top pagination and per-page selector */}
              <div className="mb-4">
                {showFavoritesOnly ? (
                  <TopPagination
                    overrideCurrentPage={favPage}
                    overrideTotalPages={favTotalPages}
                    overrideTotalServers={filteredFavServers.length}
                    onPageChange={setFavPage}
                  />
                ) : (
                  <TopPagination />
                )}
              </div>
              
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedServers.map((server, index) => {
                    const globalIndex = (favPage - 1) * perPage + index;
                    return showFavoritesOnly ? (
                      <div key={`${server.ip || server.Addr}:${server.port || server.Port}-${index}`} className="relative group">
                        <ServerCard 
                          server={server}
                          onClick={() => setSelectedServer(server)}
                        />
                        {/* Reorder buttons */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLocalReorder(index, 'up'); }}
                            disabled={globalIndex === 0}
                            className="p-1 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                            title={t.moveUp}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLocalReorder(index, 'down'); }}
                            disabled={globalIndex >= favorites.length - 1}
                            className="p-1 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                            title={t.moveDown}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ServerCard 
                        key={`${server.ip || server.Addr}:${server.port || server.Port}-${index}`} 
                        server={server}
                        onClick={() => setSelectedServer(server)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedServers.map((server, index) => {
                    const globalIndex = (favPage - 1) * perPage + index;
                    return showFavoritesOnly ? (
                      <div key={`${server.ip || server.Addr}:${server.port || server.Port}-${index}`} className="relative group">
                        {/* Reorder buttons for list view - positioned at left to avoid blocking join button */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLocalReorder(index, 'up'); }}
                            disabled={globalIndex === 0}
                            className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                            title={t.moveUp}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLocalReorder(index, 'down'); }}
                            disabled={globalIndex >= favorites.length - 1}
                            className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                            title={t.moveDown}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <ServerListItem 
                          server={server}
                          onClick={() => setSelectedServer(server)}
                        />
                      </div>
                    ) : (
                      <ServerListItem 
                        key={`${server.ip || server.Addr}:${server.port || server.Port}-${index}`} 
                        server={server}
                        onClick={() => setSelectedServer(server)}
                      />
                    );
                  })}
                </div>
              )}
              
              {/* Bottom Pagination */}
              {showFavoritesOnly ? (
                <Pagination
                  overrideCurrentPage={favPage}
                  overrideTotalPages={favTotalPages}
                  overrideTotalServers={filteredFavServers.length}
                  onPageChange={setFavPage}
                />
              ) : (
                <Pagination />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Server Detail Modal */}
      {selectedServer && (
        <ServerDetailModal 
          server={selectedServer} 
          onClose={() => setSelectedServer(null)} 
        />
      )}

      {/* Add Server Modal */}
      {showAddServerModal && (
        <AddServerModal onClose={() => setShowAddServerModal(false)} />
      )}

      {/* Add Local Server Modal */}
      {showAddLocalServerModal && (
        <AddLocalServerModal
          onClose={() => setShowAddLocalServerModal(false)}
          onAdded={(addr) => {
            if (isFavorite(addr)) {
              showToast(t.addLocalServerDuplicate, '', 'info', 3000);
            } else {
              addFavorite(addr);
              showToast(t.addLocalServerSuccess, '', 'info', 3000);
            }
          }}
        />
      )}
    </div>
  );
}

