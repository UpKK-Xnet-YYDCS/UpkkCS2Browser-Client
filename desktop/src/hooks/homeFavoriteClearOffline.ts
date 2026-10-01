import { offlineFavoriteAddresses } from '../services/homeFavoriteFilters.ts';
import type { ServerStatus } from '../types/index.ts';
import { isServerOnline } from '../utils/serverStatus.ts';

/**
 * A reload placeholder whose A2S result has not arrived yet. It reports
 * Online: false only because it has not been queried, not because it is offline.
 */
export function isFavoriteQueryPending(server: ServerStatus): boolean {
  return server.local_latency_status === 'queued' || server.local_latency_status === 'checking';
}

/** Favorites "Clear offline" removes: settled offline results, never pending placeholders. */
export function clearableOfflineFavoriteAddresses(servers: readonly ServerStatus[]): string[] {
  return offlineFavoriteAddresses(servers.filter(server => !isFavoriteQueryPending(server)));
}

/** The local favorites list after clearing: online servers plus placeholders still being queried. */
export function remainingAfterClearingOffline(servers: readonly ServerStatus[]): ServerStatus[] {
  return servers.filter(server => isServerOnline(server) || isFavoriteQueryPending(server));
}
