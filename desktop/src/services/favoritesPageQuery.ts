import type { FavoriteServer } from '@/api/favorites';
import { favoriteToServerStatus } from './favoriteServer.ts';
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

export function buildFavoriteRows(favorites: readonly FavoriteServer[]): FavoriteRow[] {
  return favorites.map((fav, sourceIndex) => ({
    fav,
    sourceIndex,
    server: favoriteToServerStatus(fav),
  }));
}

export function searchFavoriteRows<T extends { fav: Pick<FavoriteServer, 'current_name' | 'server_name' | 'server_ip' | 'server_port' | 'map_name' | 'category'> }>(
  rows: readonly T[],
  searchQuery: string,
): T[] {
  if (!searchQuery.trim()) return rows.slice();
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

export function isFavoritesAuthError(message: string): boolean {
  return message.includes('401') || message.includes('Not logged in');
}

