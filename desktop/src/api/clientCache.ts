import { CacheNamespace } from '../services/cacheNamespace.ts';
import { TtlLruCache } from '../services/ttlLruCache.ts';
import { getApiToken, getBaseUrl } from './clientConfig.ts';
import { abortAllInflight, runSharedGet, type InflightGetEntry } from './clientInflight.ts';

const requestCacheNamespace = new CacheNamespace();
const inflightRequests = new Map<string, InflightGetEntry<unknown>>();
const DEFAULT_CACHE_TTL_MS = 300_000;

function getCacheTtlMs(): number {
  try {
    const saved = localStorage.getItem('autoRefreshInterval');
    if (saved) {
      const seconds = parseInt(saved, 10);
      if (seconds > 0) return Math.max(seconds * 5000, DEFAULT_CACHE_TTL_MS);
    }
  } catch { /* ignore */ }
  return DEFAULT_CACHE_TTL_MS;
}

const responseCache = new TtlLruCache<string, unknown>(128, getCacheTtlMs);

export interface RequestSnapshot {
  endpoint: string;
  cacheKey: string;
  baseUrl: string;
  token: string | null;
}

export interface RequestCacheStats {
  hits: number;
  misses: number;
  invalidWrites: number;
  inflight: number;
  cancels: number;
}

const stats: RequestCacheStats = {
  hits: 0,
  misses: 0,
  invalidWrites: 0,
  inflight: 0,
  cancels: 0,
};

export function getRequestCacheStats(): RequestCacheStats {
  return { ...stats, inflight: inflightRequests.size };
}

export function resetRequestCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.invalidWrites = 0;
  stats.cancels = 0;
}

export function requestCacheKey(endpoint: string): string {
  return requestCacheNamespace.key(getBaseUrl(), Boolean(getApiToken()), endpoint);
}

export function snapshotRequest(endpoint: string): RequestSnapshot {
  const baseUrl = getBaseUrl();
  const token = getApiToken();
  return {
    endpoint,
    baseUrl,
    token,
    cacheKey: requestCacheNamespace.key(baseUrl, Boolean(token), endpoint),
  };
}

export function isRequestSnapshotCurrent(snapshot: RequestSnapshot): boolean {
  return snapshot.cacheKey === requestCacheKey(snapshot.endpoint);
}

export function invalidateRequestCache(): void {
  requestCacheNamespace.invalidate();
  abortAllInflight(inflightRequests);
  responseCache.clear();
}

export function getCached<T>(endpoint: string): T | undefined {
  const value = responseCache.get(requestCacheKey(endpoint)) as T | undefined;
  if (value !== undefined) {
    stats.hits += 1;
    return value;
  }
  stats.misses += 1;
  return undefined;
}

export function setCache(endpoint: string, data: unknown): void {
  setCacheIfCurrent(snapshotRequest(endpoint), data);
}

export function setCacheIfCurrent(snapshot: RequestSnapshot, data: unknown): boolean {
  if (!isRequestSnapshotCurrent(snapshot)) {
    stats.invalidWrites += 1;
    return false;
  }
  responseCache.set(snapshot.cacheKey, data);
  return true;
}

export function clearResponseCache(): void {
  responseCache.clear();
}

export function clearCacheForEndpoint(endpointSubstring: string): void {
  for (const key of responseCache.keys()) {
    if (key.includes(endpointSubstring)) {
      responseCache.delete(key);
    }
  }
}

export function hasCachedResponse(endpoint: string): boolean {
  return responseCache.has(requestCacheKey(endpoint));
}

export async function runDedupedGet<T>(
  endpoint: string,
  factory: (signal: AbortSignal) => Promise<T>,
  consumerSignal?: AbortSignal,
): Promise<T> {
  return runSharedGet({
    cacheKey: requestCacheKey(endpoint),
    inflight: inflightRequests,
    factory,
    consumerSignal,
    onCancel: () => {
      stats.cancels += 1;
    },
  });
}
