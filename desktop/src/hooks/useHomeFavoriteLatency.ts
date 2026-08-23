import { useEffect } from 'react';
import type { ServerStatus } from '@/types';

interface MeasureServersOptions {
  mode?: 'replace' | 'background';
  excludeServers?: ServerStatus[];
}

interface UseHomeFavoriteLatencyOptions {
  displayedServers: ServerStatus[];
  filteredFavServers: ServerStatus[];
  servers: ServerStatus[];
  showFavoritesOnly: boolean;
  shouldBackfillLatency: boolean;
  latencySchedulerOptions: unknown;
  measureServers: (servers: ServerStatus[], options?: MeasureServersOptions) => () => void;
}

export function useHomeFavoriteLatency({
  displayedServers,
  filteredFavServers,
  servers,
  showFavoritesOnly,
  shouldBackfillLatency,
  latencySchedulerOptions,
  measureServers,
}: UseHomeFavoriteLatencyOptions) {
  useEffect(() => {
    return measureServers(displayedServers);
  }, [displayedServers, latencySchedulerOptions, measureServers]);

  useEffect(() => {
    if (!shouldBackfillLatency) return undefined;

    const sourceServers = showFavoritesOnly ? filteredFavServers : servers;
    return measureServers(sourceServers, {
      mode: 'background',
      excludeServers: displayedServers,
    });
  }, [shouldBackfillLatency, showFavoritesOnly, filteredFavServers, servers, displayedServers, latencySchedulerOptions, measureServers]);
}
