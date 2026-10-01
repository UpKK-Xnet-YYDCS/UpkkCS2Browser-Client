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
  favLoading: boolean;
  shouldBackfillLatency: boolean;
  latencySchedulerOptions: unknown;
  measureServers: (servers: ServerStatus[], options?: MeasureServersOptions) => () => void;
  seedMeasuredServers: (servers: readonly ServerStatus[]) => Promise<void>;
}

export function useHomeFavoriteLatency({
  displayedServers,
  filteredFavServers,
  servers,
  showFavoritesOnly,
  favLoading,
  shouldBackfillLatency,
  latencySchedulerOptions,
  measureServers,
  seedMeasuredServers,
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
    if (showFavoritesOnly && favLoading) return undefined;
    let cancelled = false;
    let cancelMeasure: () => void = () => undefined;
    const start = async () => {
      if (showFavoritesOnly) await seedMeasuredServers(displayedRef.current);
      if (!cancelled) cancelMeasure = measureServers(displayedRef.current);
    };
    void start();
    return () => {
      cancelled = true;
      cancelMeasure();
    };
  }, [displayedSignature, favLoading, latencySchedulerOptions, measureServers, seedMeasuredServers, showFavoritesOnly]);

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
