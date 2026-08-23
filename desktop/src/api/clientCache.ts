import { CacheNamespace } from '@/services/cacheNamespace';
import { TtlLruCache } from '@/services/ttlLruCache';
import { getApiToken, getBaseUrl } from './clientConfig';

const requestCacheNamespace = new CacheNamespace();
const inflightRequests = new Map<string, Promise<unknown>>();
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

export function requestCacheKey(endpoint: string): string {
  return requestCacheNamespace.key(getBaseUrl(), Boolean(getApiToken()), endpoint);
}

export function invalidateRequestCache(): void {
  requestCacheNamespace.invalidate();
  inflightRequests.clear();
  responseCache.clear();
}

export function getCached<T>(endpoint: string): T | undefined {
  return responseCache.get(requestCacheKey(endpoint)) as T | undefined;
}

export function setCache(endpoint: string, data: unknown): void {
  responseCache.set(requestCacheKey(endpoint), data);
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

export async function runDedupedGet<T>(endpoint: string, factory: () => Promise<T>): Promise<T> {
  const dedupeKey = requestCacheKey(endpoint);
  const inflight = inflightRequests.get(dedupeKey) as Promise<T> | undefined;
  if (inflight) return inflight;
  const promise = factory();
  inflightRequests.set(dedupeKey, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(dedupeKey);
  }
}
