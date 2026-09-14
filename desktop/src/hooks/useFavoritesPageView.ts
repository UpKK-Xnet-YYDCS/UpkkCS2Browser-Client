import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { FavoriteServer } from '@/api/favorites';
import type { LatencyFilterValue } from '@/types/ui';
import type { LocalLatencySchedulerOptions } from '@/hooks/useLocalLatencyQueue';
import { useLatencyProjection } from '@/hooks/useLatencyProjection';
import {
  buildFavoriteRows,
  createStableFavoriteRowProjector,
  favoritePageCount,
  paginateFavoriteRows,
  searchFavoriteRows,
  type FavoriteRow,
} from '@/services/favoritesPageQuery';
import type { LatencySnapshotStore } from '@/services/latencySnapshotStore';
import { latencyTargetSignature } from '@/services/latencyTargets';
import type { ServerStatus } from '@/types';

interface MeasureServersOptions {
  mode?: 'replace' | 'background';
  excludeServers?: ServerStatus[];
}

interface UseFavoritesPageViewOptions {
  favorites: FavoriteServer[];
  searchQuery: string;
  latencyFilter: LatencyFilterValue;
  latencyStore: LatencySnapshotStore;
  currentPage: number;
  itemsPerPage: number;
  loggedIn: boolean;
  deepScanEnabled: boolean;
  latencySchedulerOptions: LocalLatencySchedulerOptions;
  measureServers: (servers: ServerStatus[], options?: MeasureServersOptions) => () => void;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}

function createFavoriteRowBuilder() {
  let previous: FavoriteRow[] = [];
  return (favorites: readonly FavoriteServer[]) => {
    previous = buildFavoriteRows(favorites, previous);
    return previous;
  };
}

export function useFavoritesPageView({
  favorites,
  searchQuery,
  latencyFilter,
  latencyStore,
  currentPage,
  itemsPerPage,
  loggedIn,
  deepScanEnabled,
  latencySchedulerOptions,
  measureServers,
  setCurrentPage,
}: UseFavoritesPageViewOptions) {
  const [buildRows] = useState(createFavoriteRowBuilder);
  const [projectRows] = useState(createStableFavoriteRowProjector);
  const favoriteRows = useMemo(() => buildRows(favorites), [buildRows, favorites]);
  const searchedFavoriteRows = useMemo(() => searchFavoriteRows(favoriteRows, searchQuery), [favoriteRows, searchQuery]);
  const computeFilteredRows = useCallback(
    () => projectRows(searchedFavoriteRows, latencyStore.getSnapshots(), latencyFilter),
    [searchedFavoriteRows, latencyFilter, latencyStore, projectRows],
  );
  const filteredFavoriteRows = useLatencyProjection(latencyStore, computeFilteredRows);
  const totalPages = favoritePageCount(filteredFavoriteRows.length, itemsPerPage);
  const paginatedFavoriteRows = useMemo(() => {
    return paginateFavoriteRows(filteredFavoriteRows, currentPage, itemsPerPage);
  }, [filteredFavoriteRows, currentPage, itemsPerPage]);
  const paginatedServers = useMemo(
    () => paginatedFavoriteRows.map(row => row.server),
    [paginatedFavoriteRows],
  );
  const searchedServers = useMemo(
    () => searchedFavoriteRows.map(row => row.server),
    [searchedFavoriteRows],
  );
  const paginatedSignature = latencyTargetSignature(paginatedServers);
  const searchedSignature = latencyTargetSignature(searchedServers);
  const paginatedServersRef = useRef(paginatedServers);
  const searchedServersRef = useRef(searchedServers);

  useEffect(() => {
    paginatedServersRef.current = paginatedServers;
  }, [paginatedServers]);

  useEffect(() => {
    searchedServersRef.current = searchedServers;
  }, [searchedServers]);

  useEffect(() => {
    if (!loggedIn) return undefined;
    return measureServers(paginatedServersRef.current);
  }, [loggedIn, paginatedSignature, latencySchedulerOptions, measureServers]);

  useEffect(() => {
    if (!loggedIn || !deepScanEnabled) return undefined;
    return measureServers(searchedServersRef.current, {
      mode: 'background',
      excludeServers: paginatedServersRef.current,
    });
  }, [
    loggedIn,
    deepScanEnabled,
    searchedSignature,
    paginatedSignature,
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
