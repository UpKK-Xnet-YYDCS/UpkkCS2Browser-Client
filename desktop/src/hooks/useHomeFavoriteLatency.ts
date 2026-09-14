import { useEffect, useRef } from 'react';
import type { ServerStatus } from '@/types';
import { latencyTargetSignature } from '@/services/latencyTargets';

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
  const displayedRef = useRef(displayedServers);
  const filteredRef = useRef(filteredFavServers);
  const serversRef = useRef(servers);
  const displayedSignature = latencyTargetSignature(displayedServers);
  const backfillSource = showFavoritesOnly ? filteredFavServers : servers;
  const backfillSignature = shouldBackfillLatency ? latencyTargetSignature(backfillSource) : '';

  useEffect(() => {
    displayedRef.current = displayedServers;
  }, [displayedServers]);

  useEffect(() => {
    filteredRef.current = filteredFavServers;
  }, [filteredFavServers]);

  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  useEffect(() => {
    return measureServers(displayedRef.current);
  }, [displayedSignature, latencySchedulerOptions, measureServers]);

  useEffect(() => {
    if (!shouldBackfillLatency) return undefined;
    return measureServers(showFavoritesOnly ? filteredRef.current : serversRef.current, {
      mode: 'background',
      excludeServers: displayedRef.current,
    });
  }, [
    shouldBackfillLatency,
    showFavoritesOnly,
    backfillSignature,
    displayedSignature,
    latencySchedulerOptions,
    measureServers,
  ]);
}
