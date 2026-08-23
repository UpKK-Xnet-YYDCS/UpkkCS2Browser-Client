import type { FavoriteServer } from '@/api/favorites';

export function favoritePageCount(totalItems: number, itemsPerPage: number): number {
  return Math.max(1, Math.ceil(totalItems / itemsPerPage));
}

export function favoritePageItemIndex(page: number, perPage: number, index: number): number {
  return (page - 1) * perPage + index;
}

export function paginateFavoriteRows<T>(rows: readonly T[], currentPage: number, itemsPerPage: number): T[] {
  const start = favoritePageItemIndex(currentPage, itemsPerPage, 0);
  return rows.slice(start, start + itemsPerPage);
}

export function favoriteReorderTargetIndex(
  sourceIndex: number,
  direction: 'up' | 'down',
  length: number,
): number | null {
  const swapIndex = direction === 'up' ? sourceIndex - 1 : sourceIndex + 1;
  if (swapIndex < 0 || swapIndex >= length) return null;
  return swapIndex;
}

export function favoriteVisiblePages(currentPage: number, totalPages: number): number[] {
  const count = Math.min(5, totalPages);
  return Array.from({ length: count }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });
}

export function swapFavoriteOrder<T>(items: readonly T[], sourceIndex: number, direction: 'up' | 'down'): T[] | null {
  const swapIndex = direction === 'up' ? sourceIndex - 1 : sourceIndex + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return null;
  const next = items.slice();
  const source = next[sourceIndex];
  const swap = next[swapIndex];
  if (source === undefined || swap === undefined) return null;
  next[sourceIndex] = swap;
  next[swapIndex] = source;
  return next;
}

export function favoriteAddressSetChanged(
  previous: Iterable<string>,
  next: Iterable<string>,
): boolean {
  const previousSet = previous instanceof Set ? previous : new Set(previous);
  const nextSet = next instanceof Set ? next : new Set(next);
  return nextSet.size !== previousSet.size || [...nextSet].some((address) => !previousSet.has(address));
}

export function nextAutoRefreshCountdown(previous: number, interval: number): {
  next: number;
  shouldRefresh: boolean;
} {
  if (previous <= 1) return { next: interval, shouldRefresh: true };
  return { next: previous - 1, shouldRefresh: false };
}

export function favoriteSortOrders(favorites: readonly Pick<FavoriteServer, 'server_ip' | 'server_port'>[]) {
  return favorites.map((fav, i) => ({
    server_ip: fav.server_ip,
    server_port: fav.server_port,
    sort_order: i,
  }));
}
