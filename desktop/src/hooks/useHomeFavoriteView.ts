import { useEffect, useMemo, useState } from 'react';
import type { LatencyFilterValue } from '@/types/ui';
import {
  collectFavoriteGameNames,
  filterFavoriteServersByGame,
  filterFavoriteServersByOnline,
  filterFavoriteServersBySearch,
} from '@/services/homeFavoriteFilters';
import { filterServersByLatency } from '@/services/latencyDisplay';
import {
  favoritePageCount,
  paginateFavoriteRows,
} from '@/services/favoritePagination';
import type { LocalLatencySnapshot } from '@/services/a2sLatencyTypes';
import type { ServerStatus } from '@/types';

interface UseHomeFavoriteViewOptions {
  favServers: ServerStatus[];
  servers: ServerStatus[];
  perPage: number;
  showFavoritesOnly: boolean;
  latencyByKey: Record<string, LocalLatencySnapshot>;
}

export function useHomeFavoriteView({
  favServers,
  servers,
  perPage,
  showFavoritesOnly,
  latencyByKey,
}: UseHomeFavoriteViewOptions) {
  const [favPage, setFavPage] = useState(1);
  const [favSearchQuery, setFavSearchQuery] = useState('');
  const [showOfflineServers, setShowOfflineServers] = useState(false);
  const [favGameFilter, setFavGameFilter] = useState('');
  const [showAllGameTags, setShowAllGameTags] = useState(false);
  const [latencyFilter, setLatencyFilter] = useState<LatencyFilterValue>('all');

  // Extract unique game names from local favorites for filter tags (only when >1 game)
  // Sort by server count descending, include count for display
  const favGameNames = useMemo(() => collectFavoriteGameNames(favServers), [favServers]);

  // Compute displayed servers and pagination for favorites-only mode
  // Layered useMemo chain: each filter stage only re-runs when its specific dependency changes

  // Stage 1: Online/offline filter
  const onlineFavServers = useMemo(() => filterFavoriteServersByOnline(favServers, showOfflineServers), [favServers, showOfflineServers]);

  // Stage 2: Game filter (depends on stage 1)
  const gameFavServers = useMemo(() => filterFavoriteServersByGame(onlineFavServers, favGameFilter), [onlineFavServers, favGameFilter]);

  // Stage 3: Search filter (depends on stage 2)
  const filteredFavServers = useMemo(() => filterFavoriteServersBySearch(gameFavServers, favSearchQuery), [gameFavServers, favSearchQuery]);

  const latencyFilteredFavServers = useMemo(
    () => filterServersByLatency(filteredFavServers, latencyByKey, latencyFilter),
    [filteredFavServers, latencyByKey, latencyFilter],
  );

  const favTotalPages = favoritePageCount(latencyFilteredFavServers.length, perPage);

  // Clamp favPage to valid range when favorites list changes
  useEffect(() => {
    if (showFavoritesOnly && favPage > favTotalPages) {
      const timer = window.setTimeout(() => setFavPage(Math.max(1, favTotalPages)), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [showFavoritesOnly, favPage, favTotalPages]);

  // Reset favPage when search query or game filter changes
  useEffect(() => {
    const timer = window.setTimeout(() => setFavPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [favSearchQuery, favGameFilter, latencyFilter]);

  const displayedServers = useMemo(() => {
    // Geo filters (continent/geo_region/country) are applied server-side via API params,
    // so no client-side filtering is needed here. Just paginate local favorites.
    const result = showFavoritesOnly
      ? paginateFavoriteRows(latencyFilteredFavServers, favPage, perPage)
      : servers;
    return result;
  }, [servers, showFavoritesOnly, latencyFilteredFavServers, favPage, perPage]);

  const displayedServersWithLatency = useMemo(
    () => filterServersByLatency(displayedServers, latencyByKey, latencyFilter),
    [displayedServers, latencyByKey, latencyFilter],
  );

  return {
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
  };
}
