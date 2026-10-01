import { parseServerAddress } from '../services/a2sAddress.ts';
import { favoriteReorderTargetIndex } from '../services/favoritePagination.ts';
import type { ServerStatus } from '../types/index.ts';

type ServerAddress = Pick<ServerStatus, 'ip' | 'port'>;

export interface VisibleFavoriteReorder {
  /** The clicked server and the visible neighbour it swaps with. */
  source: ServerAddress;
  neighbour: ServerAddress;
  /** Their positions in the persisted favorites list. */
  from: number;
  to: number;
}

function addressKey(server: ServerAddress): string {
  return `${server.ip}:${server.port}`;
}

/** Position of `server` in the persisted favorites address list, or -1. */
export function favoriteAddressIndex(favorites: readonly string[], server: ServerAddress): number {
  const key = addressKey(server);
  return favorites.findIndex(address => {
    const parsed = parseServerAddress(address);
    return parsed !== null && addressKey(parsed) === key;
  });
}

/**
 * Maps a move on the visible (filtered and paginated) favorites list to the two
 * favorites it swaps: the clicked server and its visible neighbour, resolved to
 * their real positions by address. Without filters this is the plain page index.
 */
export function resolveVisibleFavoriteReorder(
  visible: readonly ServerStatus[],
  visibleIndex: number,
  direction: 'up' | 'down',
  favorites: readonly string[],
): VisibleFavoriteReorder | null {
  const neighbourIndex = favoriteReorderTargetIndex(visibleIndex, direction, visible.length);
  const source = visible[visibleIndex];
  const neighbour = neighbourIndex === null ? undefined : visible[neighbourIndex];
  if (!source || !neighbour) return null;
  const from = favoriteAddressIndex(favorites, source);
  const to = favoriteAddressIndex(favorites, neighbour);
  if (from < 0 || to < 0 || from === to) return null;
  return { source, neighbour, from, to };
}

/** Swaps two servers of the local favorites list by address; null when either is missing. */
export function swapFavoriteServers<T extends ServerAddress>(
  servers: readonly T[],
  first: ServerAddress,
  second: ServerAddress,
): T[] | null {
  const firstIndex = servers.findIndex(server => addressKey(server) === addressKey(first));
  const secondIndex = servers.findIndex(server => addressKey(server) === addressKey(second));
  if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) return null;
  const next = servers.slice();
  next[firstIndex] = servers[secondIndex];
  next[secondIndex] = servers[firstIndex];
  return next;
}
