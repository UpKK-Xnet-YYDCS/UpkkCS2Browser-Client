import { createLocalLatencyScheduler } from './a2sLatency.ts';
import { isTauriAvailable, queryServerA2S } from './a2sQuery.ts';

export interface DesktopA2SLatencySchedulerOptions {
  workerCount?: number;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

export function createDesktopA2SLatencyScheduler(options: DesktopA2SLatencySchedulerOptions = {}) {
  return createLocalLatencyScheduler({
    concurrency: options.workerCount,
    ttlMs: 60_000,
    timeoutMs: options.timeoutMs,
    retryCount: options.retryCount,
    retryDelayMs: options.retryDelayMs,
    isAvailable: isTauriAvailable,
    query: queryServerA2S,
  });
}
