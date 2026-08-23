import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ServerStatus } from '@/types';
import type { LocalLatencyScheduler, LocalLatencySnapshot } from '@/services/a2sLatencyTypes';
import { isSameLatencySnapshot } from '@/services/latencyDisplay';
import { excludeForegroundTargets, getUniqueLatencyTargets } from '@/services/latencyTargets';
import {
  useLatencyDetectionSettings,
  type LatencyDetectionSettings,
} from '@/services/latencySettings';

export interface LocalLatencySchedulerOptions {
  workerCount: number;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
}

interface MeasureServersOptions {
  mode?: 'replace' | 'background';
  excludeServers?: ServerStatus[];
}

interface UseLocalLatencyQueueResult {
  latencyByKey: Record<string, LocalLatencySnapshot>;
  latencyDetectionSettings: LatencyDetectionSettings;
  latencySchedulerOptions: LocalLatencySchedulerOptions;
  measureServers: (servers: ServerStatus[], options?: MeasureServersOptions) => () => void;
}

export function useLocalLatencyQueue(logPrefix: string): UseLocalLatencyQueueResult {
  const latencyDetectionSettings = useLatencyDetectionSettings();
  const latencySchedulerOptions = useMemo(() => ({
    workerCount: latencyDetectionSettings.workerCount,
    timeoutMs: latencyDetectionSettings.a2sTimeoutMs,
    retryCount: latencyDetectionSettings.retryCount,
    retryDelayMs: latencyDetectionSettings.retryDelayMs,
  }), [
    latencyDetectionSettings.a2sTimeoutMs,
    latencyDetectionSettings.retryCount,
    latencyDetectionSettings.retryDelayMs,
    latencyDetectionSettings.workerCount,
  ]);
  const [latencyByKey, setLatencyByKey] = useState<Record<string, LocalLatencySnapshot>>({});
  const latencySchedulerRef = useRef<LocalLatencyScheduler | null>(null);
  const schedulerOptionsRef = useRef(latencySchedulerOptions);
  const boundSchedulerOptionsRef = useRef<LocalLatencySchedulerOptions | null>(null);
  const pendingUpdatesRef = useRef<Record<string, LocalLatencySnapshot>>({});
  const updateFrameRef = useRef<number | null>(null);

  const ensureScheduler = useCallback(async () => {
    const { createDesktopA2SLatencyScheduler } = await import('@/services/a2s');
    const options = schedulerOptionsRef.current;
    if (!latencySchedulerRef.current || boundSchedulerOptionsRef.current !== options) {
      latencySchedulerRef.current = createDesktopA2SLatencyScheduler(options);
      boundSchedulerOptionsRef.current = options;
    }
    return latencySchedulerRef.current;
  }, []);

  useEffect(() => {
    schedulerOptionsRef.current = latencySchedulerOptions;
    void ensureScheduler();
  }, [ensureScheduler, latencySchedulerOptions]);

  useEffect(() => () => {
    if (updateFrameRef.current !== null) window.cancelAnimationFrame(updateFrameRef.current);
  }, []);

  const queueSnapshotUpdate = useCallback((key: string, snapshot: LocalLatencySnapshot) => {
    pendingUpdatesRef.current[key] = snapshot;
    if (updateFrameRef.current !== null) return;
    updateFrameRef.current = window.requestAnimationFrame(() => {
      updateFrameRef.current = null;
      const updates = pendingUpdatesRef.current;
      pendingUpdatesRef.current = {};
      setLatencyByKey(previous => {
        let next = previous;
        for (const [updateKey, update] of Object.entries(updates)) {
          if (isSameLatencySnapshot(previous[updateKey], update)) continue;
          if (next === previous) next = { ...previous };
          next[updateKey] = update;
        }
        return next;
      });
    });
  }, []);

  const measureServers = useCallback((servers: ServerStatus[], options: MeasureServersOptions = {}) => {
    const targets = excludeForegroundTargets(
      getUniqueLatencyTargets(servers),
      options.mode === 'background' ? options.excludeServers : undefined,
    );
    let cancelled = false;

    const measureOptions = options.mode ? { mode: options.mode } : undefined;

    void ensureScheduler().then(scheduler => {
      if (cancelled) return;
      return scheduler.measure(targets, (key, snapshot) => {
        if (cancelled) return;
        queueSnapshotUpdate(key, snapshot);
      }, measureOptions);
    }).catch(error => {
      console.error("[" + logPrefix + "] Failed to measure local A2S latency:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [logPrefix, queueSnapshotUpdate, ensureScheduler]);

  return {
    latencyByKey,
    latencyDetectionSettings,
    latencySchedulerOptions,
    measureServers,
  };
}
