import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ServerStatus } from '@/types';
import type { LocalLatencyScheduler, LocalLatencySnapshot } from '@/services/a2sLatencyTypes';
import { isDocumentHidden } from '@/services/deadlineCountdown';
import { createLatencySnapshotStore, type LatencySnapshotStore } from '@/services/latencySnapshotStore';
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
  latencyStore: LatencySnapshotStore;
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
  const [latencyStore] = useState(createLatencySnapshotStore);
  const latencySchedulerRef = useRef<LocalLatencyScheduler | null>(null);
  const schedulerOptionsRef = useRef(latencySchedulerOptions);
  const boundSchedulerOptionsRef = useRef<LocalLatencySchedulerOptions | null>(null);
  const pendingUpdatesRef = useRef<Record<string, LocalLatencySnapshot>>({});
  const updateFrameRef = useRef<number | null>(null);

  const ensureScheduler = useCallback(async () => {
    const { createDesktopA2SLatencyScheduler } = await import('@/services/a2s');
    const options = schedulerOptionsRef.current;
    if (!latencySchedulerRef.current || boundSchedulerOptionsRef.current !== options) {
      latencySchedulerRef.current?.release();
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
    latencySchedulerRef.current?.release();
    latencySchedulerRef.current = null;
  }, []);

  useEffect(() => {
    const flush = () => {
      if (!isDocumentHidden()) latencyStore.flushNotify();
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [latencyStore]);

  const queueSnapshotUpdate = useCallback((key: string, snapshot: LocalLatencySnapshot) => {
    pendingUpdatesRef.current[key] = snapshot;
    if (updateFrameRef.current !== null) return;
    updateFrameRef.current = window.requestAnimationFrame(() => {
      updateFrameRef.current = null;
      const updates = pendingUpdatesRef.current;
      pendingUpdatesRef.current = {};
      latencyStore.apply(updates, { notify: !isDocumentHidden() });
    });
  }, [latencyStore]);

  const measureServers = useCallback((servers: ServerStatus[], options: MeasureServersOptions = {}) => {
    const targets = excludeForegroundTargets(
      getUniqueLatencyTargets(servers),
      options.mode === 'background' ? options.excludeServers : undefined,
    );
    let cancelled = false;

    const measureOptions = options.mode ? { mode: options.mode } : undefined;
    const listener = (key: string, snapshot: LocalLatencySnapshot) => {
      if (cancelled) return;
      queueSnapshotUpdate(key, snapshot);
    };

    void ensureScheduler().then(scheduler => {
      if (cancelled) return;
      return scheduler.measure(targets, listener, measureOptions);
    }).catch(error => {
      console.error("[" + logPrefix + "] Failed to measure local A2S latency:", error);
    });

    return () => {
      cancelled = true;
      latencySchedulerRef.current?.cancelListener(listener);
    };
  }, [logPrefix, queueSnapshotUpdate, ensureScheduler]);

  return {
    latencyStore,
    latencyDetectionSettings,
    latencySchedulerOptions,
    measureServers,
  };
}
