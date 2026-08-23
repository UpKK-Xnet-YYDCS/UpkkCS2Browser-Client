import { parseServerAddress } from './a2sAddress.ts';
import type { ServerStatus } from '../types/index.ts';
import { isServerOnline } from '../utils/serverStatus.ts';

export function collectFavoriteGameNames(servers: readonly ServerStatus[]): Array<{ name: string; count: number }> {
  const countMap = new Map<string, number>();
  for (const server of servers) {
    const game = server.game?.trim();
    if (game) countMap.set(game, (countMap.get(game) || 0) + 1);
  }
  return Array.from(countMap.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => ({ name, count }));
}

export function filterFavoriteServersByOnline<T extends ServerStatus>(
  servers: readonly T[],
  showOfflineServers: boolean,
): T[] {
  if (showOfflineServers) return [...servers];
  return servers.filter(server => isServerOnline(server));
}

export function filterFavoriteServersByGame<T extends { game?: string }>(
  servers: readonly T[],
  gameFilter: string,
): T[] {
  if (!gameFilter) return [...servers];
  return servers.filter(server => (server.game?.trim() || '') === gameFilter);
}

export function filterFavoriteServersBySearch<T extends Pick<ServerStatus, 'name' | 'ip' | 'port' | 'map_name' | 'game'>>(
  servers: readonly T[],
  query: string,
): T[] {
  if (!query.trim()) return [...servers];
  const needle = query.toLowerCase();
  return servers.filter(server => {
    const name = (server.name || '').toLowerCase();
    const addr = (server.ip + ':' + server.port).toLowerCase();
    const map = (server.map_name || '').toLowerCase();
    const game = (server.game || '').toLowerCase();
    return name.includes(needle) || addr.includes(needle) || map.includes(needle) || game.includes(needle);
  });
}

export function parseImportedFavoriteAddresses(raw: string): string[] {
  const data = JSON.parse(raw) as { favorites?: unknown } | unknown[];
  const addrs = Array.isArray(data)
    ? data
    : Array.isArray((data as { favorites?: unknown }).favorites)
      ? (data as { favorites: unknown[] }).favorites
      : [];
  return addrs.filter((addr): addr is string => typeof addr === 'string' && parseServerAddress(addr) !== null);
}

export function offlineFavoriteAddresses(servers: readonly ServerStatus[]): string[] {
  return servers
    .filter(server => !isServerOnline(server))
    .map(server => server.ip + ':' + server.port);
}

export function favoriteExportFilename(now = new Date()): string {
  return 'xproj_favorites_' + now.toISOString().slice(0, 10) + '.json';
}

export function serializeFavoriteExport(favorites: readonly string[], now = new Date()): string {
  return JSON.stringify({ favorites, exportedAt: now.toISOString() }, null, 2);
}

export function truncateFavoriteGameLabel(name: string, maxBytes = 32): string {
  const encoder = new TextEncoder();
  if (encoder.encode(name).length <= maxBytes) return name;
  let end = name.length;
  while (end > 0 && encoder.encode(name.slice(0, end)).length > maxBytes) end--;
  return name.slice(0, end) + '…';
}
