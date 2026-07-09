import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ServerStatus } from '@/types';
import {
  createDesktopA2SLatencyScheduler,
  type LocalLatencySnapshot,
  type LocalLatencyTarget,
} from '@/services/a2s';
import {
  getServerLatencyTarget,
  isSameLatencySnapshot,
} from '@/services/latencyDisplay';
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

function targetAddress(target: LocalLatencyTarget): string {
  return `${target.ip.trim()}:${String(target.port).trim()}`;
}

function getUniqueLatencyTargets(servers: ServerStatus[]): LocalLatencyTarget[] {
  const targetsByAddress = new Map<string, LocalLatencyTarget>();

  for (const server of servers) {
    const target = getServerLatencyTarget(server);
    if (!target) continue;

    const address = targetAddress(target);
    const existing = targetsByAddress.get(address);
    if (!existing) {
      targetsByAddress.set(address, target);
      continue;
    }

    targetsByAddress.set(address, {
      ...existing,
      priority: Math.min(existing.priority ?? 0, target.priority ?? 0),
    });
  }

  return Array.from(targetsByAddress.values());
}

function excludeForegroundTargets(
  targets: LocalLatencyTarget[],
  foregroundServers: ServerStatus[] | undefined,
): LocalLatencyTarget[] {
  if (!foregroundServers || foregroundServers.length === 0) {
    return targets;
  }

  const foregroundAddresses = new Set(
    getUniqueLatencyTargets(foregroundServers).map(targetAddress),
  );

  return targets.filter(target => !foregroundAddresses.has(targetAddress(target)));
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
  const latencySchedulerRef = useRef(createDesktopA2SLatencyScheduler(latencySchedulerOptions));

  useEffect(() => {
    latencySchedulerRef.current = createDesktopA2SLatencyScheduler(latencySchedulerOptions);
  }, [latencySchedulerOptions]);

  const measureServers = useCallback((servers: ServerStatus[], options: MeasureServersOptions = {}) => {
    const targets = excludeForegroundTargets(
      getUniqueLatencyTargets(servers),
      options.mode === 'background' ? options.excludeServers : undefined,
    );
    let cancelled = false;

    latencySchedulerRef.current.measure(targets, (key, snapshot) => {
      if (cancelled) return;
      setLatencyByKey(prev => (
        isSameLatencySnapshot(prev[key], snapshot) ? prev : { ...prev, [key]: snapshot }
      ));
    }, options.mode ? { mode: options.mode } : undefined).catch(error => {
      console.error(`[${logPrefix}] Failed to measure local A2S latency:`, error);
    });

    return () => {
      cancelled = true;
    };
  }, [logPrefix]);

  return {
    latencyByKey,
    latencyDetectionSettings,
    latencySchedulerOptions,
    measureServers,
  };
}
