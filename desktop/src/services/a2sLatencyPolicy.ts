import type { GroupedLatencyJob, LocalLatencyTarget } from './a2sLatencyTypes.ts';

export const DEFAULT_LATENCY_CONCURRENCY = 3;
export const DEFAULT_LATENCY_TTL_MS = 60_000;
export const DEFAULT_LATENCY_TIMEOUT_MS = 2_000;
export const DEFAULT_LATENCY_RETRY_COUNT = 1;
export const DEFAULT_LATENCY_RETRY_DELAY_MS = 300;

export function normalizeLatencyConcurrency(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_LATENCY_CONCURRENCY;
  return Math.max(1, Math.min(6, Math.floor(value)));
}

export function normalizeLatencyTimeoutMs(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_LATENCY_TIMEOUT_MS;
  return Math.max(500, Math.min(5_000, Math.floor(value)));
}

export function normalizeLatencyRetryCount(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_LATENCY_RETRY_COUNT;
  return Math.max(0, Math.min(5, Math.floor(value)));
}

export function normalizeLatencyRetryDelayMs(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_LATENCY_RETRY_DELAY_MS;
  return Math.max(0, Math.min(3_000, Math.floor(value)));
}

export function normalizeLatencyPriority(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return 0;
  return Math.max(0, Math.floor(value));
}

export function latencyAddressKey(ip: string, port: string): string {
  return ip.trim() + ':' + String(port).trim();
}

export function groupLatencyTargets(targets: readonly LocalLatencyTarget[]): Map<string, GroupedLatencyJob> {
  const grouped = new Map<string, GroupedLatencyJob>();
  for (const target of targets) {
    const address = latencyAddressKey(target.ip, target.port);
    if (!address || address === ':') continue;
    const existing = grouped.get(address);
    if (existing) {
      existing.keys.push(target.key);
      existing.priority = Math.min(existing.priority, normalizeLatencyPriority(target.priority));
    } else {
      grouped.set(address, {
        address,
        target,
        keys: [target.key],
        priority: normalizeLatencyPriority(target.priority),
      });
    }
  }
  return grouped;
}

