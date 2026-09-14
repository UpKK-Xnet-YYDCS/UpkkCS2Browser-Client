import type { FavoriteServer } from '@/api/favorites';
import type { LatencyFilter } from './latencyDisplay.ts';
import { applyLatencySnapshotToServer, matchesLatencyFilter } from './latencyDisplay.ts';
import { favoriteToServerStatus } from './favoriteServer.ts';
import { areServerEntitiesEquivalent, reuseArrayIfIdentical } from './serverEntities.ts';
import type { LocalLatencySnapshot } from './a2sLatencyTypes.ts';
import type { ServerStatus } from '@/types';

export const FAVORITES_PAGE_SIZE_OPTIONS = [12, 24, 48];
export const DEFAULT_AUTO_REFRESH_INTERVAL = 60;
export const FAVORITES_PAGE_SIZE_KEY = 'favoritesPerPage';
export const FAVORITES_VIEW_MODE_KEY = 'favoritesViewMode';
export const AUTO_REFRESH_INTERVAL_KEY = 'autoRefreshInterval';

export type FavoritesViewMode = 'card' | 'list';

export interface FavoriteRow {
  fav: FavoriteServer;
  sourceIndex: number;
  server: ServerStatus;
}

export function readStoredInteger(value: string | null, fallback: number): number {
  return value ? parseInt(value, 10) : fallback;
}

export function readFavoritesPageSize(value: string | null): number {
  return readStoredInteger(value, FAVORITES_PAGE_SIZE_OPTIONS[0]);
}

export function readFavoritesViewMode(value: string | null): FavoritesViewMode {
  return value === 'list' ? 'list' : 'card';
}

export function readAutoRefreshInterval(value: string | null): number {
  return readStoredInteger(value, DEFAULT_AUTO_REFRESH_INTERVAL);
}

export function buildFavoriteRows(
  favorites: readonly FavoriteServer[],
  previous: readonly FavoriteRow[] = [],
): FavoriteRow[] {
  const previousByIndex = previous.length === favorites.length
    ? previous
    : undefined;
  const next = favorites.map((fav, sourceIndex) => {
    const prior = previousByIndex?.[sourceIndex];
    if (prior && prior.fav === fav && prior.sourceIndex === sourceIndex) return prior;
    const server = favoriteToServerStatus(fav);
    if (prior && prior.fav === fav && prior.sourceIndex === sourceIndex && areServerEntitiesEquivalent(prior.server, server)) {
      return prior;
    }
    return { fav, sourceIndex, server };
  });
  return reuseArrayIfIdentical(previous, next);
}

export function projectFavoriteRowsWithLatency(
  rows: readonly FavoriteRow[],
  latencyByKey: Readonly<Record<string, LocalLatencySnapshot | undefined>>,
  filter: LatencyFilter,
  previous: readonly FavoriteRow[] = [],
): FavoriteRow[] {
  const previousByIndex = new Map(previous.map(row => [row.sourceIndex, row]));
  const projected = rows.map(row => {
    const server = applyLatencySnapshotToServer(row.server, latencyByKey);
    const prior = previousByIndex.get(row.sourceIndex);
    if (prior && prior.fav === row.fav && prior.sourceIndex === row.sourceIndex && areServerEntitiesEquivalent(prior.server, server)) {
      return prior;
    }
    if (server === row.server) return row;
    return { ...row, server };
  });
  const filtered = filter === 'all'
    ? projected
    : projected.filter(row => matchesLatencyFilter(row.server, filter));
  return reuseArrayIfIdentical(previous, filtered);
}

export function searchFavoriteRows<T extends { fav: Pick<FavoriteServer, 'current_name' | 'server_name' | 'server_ip' | 'server_port' | 'map_name' | 'category'> }>(
  rows: readonly T[],
  searchQuery: string,
): T[] {
  if (!searchQuery.trim()) return rows as T[];
  const q = searchQuery.toLowerCase();
  return rows.filter(({ fav }) => {
    const name = (fav.current_name || fav.server_name || '').toLowerCase();
    const addr = (fav.server_ip + ':' + fav.server_port).toLowerCase();
    const map = (fav.map_name || '').toLowerCase();
    const category = (fav.category || '').toLowerCase();
    return name.includes(q) || addr.includes(q) || map.includes(q) || category.includes(q);
  });
}

export {
  favoriteAddressSetChanged,
  favoritePageCount,
  favoritePageItemIndex,
  favoriteReorderTargetIndex,
  favoriteSortOrders,
  favoriteVisiblePages,
  nextAutoRefreshCountdown,
  paginateFavoriteRows,
  swapFavoriteOrder,
} from './favoritePagination.ts';

export function createStableFavoriteRowProjector() {
  let previousProjected: FavoriteRow[] = [];
  let previousFiltered: FavoriteRow[] = [];
  let previousFilter: LatencyFilter | null = null;

  return function project(
    rows: readonly FavoriteRow[],
    latencyByKey: Readonly<Record<string, LocalLatencySnapshot | undefined>>,
    filter: LatencyFilter,
  ): FavoriteRow[] {
    const previousByIndex = new Map(previousProjected.map(row => [row.sourceIndex, row]));
    previousProjected = rows.map(row => {
      const server = applyLatencySnapshotToServer(row.server, latencyByKey);
      const prior = previousByIndex.get(row.sourceIndex);
      if (prior && prior.fav === row.fav && areServerEntitiesEquivalent(prior.server, server)) {
        return prior;
      }
      if (server === row.server) return row;
      return { ...row, server };
    });
    if (filter === 'all') {
      previousFilter = filter;
      previousFiltered = previousProjected;
      return previousProjected;
    }
    const filtered = previousProjected.filter(row => matchesLatencyFilter(row.server, filter));
    previousFiltered = reuseArrayIfIdentical(previousFilter === filter ? previousFiltered : [], filtered);
    previousFilter = filter;
    return previousFiltered;
  };
}

export function isFavoritesAuthError(message: string): boolean {
  return message.includes('401') || message.includes('Not logged in');
}

