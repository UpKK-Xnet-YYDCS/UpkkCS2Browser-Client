import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { FavoriteServer } from '@/api/favorites';
import type { LatencyFilterValue } from '@/types/ui';
import type { LocalLatencySchedulerOptions } from '@/hooks/useLocalLatencyQueue';
import type { LocalLatencySnapshot } from '@/services/a2sLatencyTypes';
import { applyLatencySnapshotToServer, matchesLatencyFilter } from '@/services/latencyDisplay';
import {
  buildFavoriteRows,
  favoritePageCount,
  paginateFavoriteRows,
  searchFavoriteRows,
} from '@/services/favoritesPageQuery';
import type { ServerStatus } from '@/types';

interface MeasureServersOptions {
  mode?: 'replace' | 'background';
  excludeServers?: ServerStatus[];
}

interface UseFavoritesPageViewOptions {
  favorites: FavoriteServer[];
  searchQuery: string;
  latencyFilter: LatencyFilterValue;
  latencyByKey: Record<string, LocalLatencySnapshot>;
  currentPage: number;
  itemsPerPage: number;
  loggedIn: boolean;
  deepScanEnabled: boolean;
  latencySchedulerOptions: LocalLatencySchedulerOptions;
  measureServers: (servers: ServerStatus[], options?: MeasureServersOptions) => () => void;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}

export function useFavoritesPageView({
  favorites,
  searchQuery,
  latencyFilter,
  latencyByKey,
  currentPage,
  itemsPerPage,
  loggedIn,
  deepScanEnabled,
  latencySchedulerOptions,
  measureServers,
  setCurrentPage,
}: UseFavoritesPageViewOptions) {
  const favoriteRows = useMemo(() => buildFavoriteRows(favorites), [favorites]);
  const searchedFavoriteRows = useMemo(() => searchFavoriteRows(favoriteRows, searchQuery), [favoriteRows, searchQuery]);
  const filteredFavoriteRows = useMemo(() => {
    return searchedFavoriteRows
      .map(row => ({ ...row, server: applyLatencySnapshotToServer(row.server, latencyByKey) }))
      .filter(row => matchesLatencyFilter(row.server, latencyFilter));
  }, [searchedFavoriteRows, latencyByKey, latencyFilter]);
  const totalPages = favoritePageCount(filteredFavoriteRows.length, itemsPerPage);
  const paginatedFavoriteRows = useMemo(() => {
    return paginateFavoriteRows(filteredFavoriteRows, currentPage, itemsPerPage);
  }, [filteredFavoriteRows, currentPage, itemsPerPage]);

  useEffect(() => {
    if (!loggedIn) return undefined;
    return measureServers(paginatedFavoriteRows.map(row => row.server));
  }, [loggedIn, paginatedFavoriteRows, latencySchedulerOptions, measureServers]);

  useEffect(() => {
    if (!loggedIn || !deepScanEnabled) return undefined;
    return measureServers(searchedFavoriteRows.map(row => row.server), {
      mode: 'background',
      excludeServers: paginatedFavoriteRows.map(row => row.server),
    });
  }, [
    loggedIn,
    deepScanEnabled,
    searchedFavoriteRows,
    paginatedFavoriteRows,
    latencySchedulerOptions,
    measureServers,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [searchQuery, latencyFilter, setCurrentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      const timer = window.setTimeout(() => setCurrentPage(Math.max(1, totalPages)), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentPage, totalPages, setCurrentPage]);

  return {
    filteredFavoriteRows,
    paginatedFavoriteRows,
    totalPages,
  };
}
