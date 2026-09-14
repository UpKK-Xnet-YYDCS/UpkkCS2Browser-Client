import { setCloudApiTokenInMemory } from '../services/cloudToken.ts';
import { invalidateRequestCache } from './clientCache.ts';
import { getBaseUrl, writeApiBaseUrl } from './clientConfig.ts';

export {
  XPROJ_USER_AGENT,
  getBaseUrl,
  getApiBaseUrl,
  getApiToken,
} from './clientConfig.ts';
export { buildQuery } from './clientQuery.ts';
export type { GeoFilterParams } from './clientQuery.ts';

export {
  clearResponseCache,
  clearCacheForEndpoint,
  hasCachedResponse,
  getRequestCacheStats,
} from './clientCache.ts';

export {
  getPrefetchDelay,
  setPrefetchDelay,
  getPrefetchPages,
  setPrefetchPages,
  cancelPrefetch,
  startPrefetchSequence,
  isPrefetchSequenceCurrent,
  collectPrefetchPageNumbers,
} from './clientPrefetch.ts';

export {
  fetchApi,
  fetchWithRetry,
  refreshEndpoint,
} from './clientRequest.ts';
export type { ApiCallOptions } from './clientRequest.ts';

export const setApiBaseUrl = (url: string) => {
  if (url !== getBaseUrl()) invalidateRequestCache();
  writeApiBaseUrl(url);
};

export const setApiToken = (token: string) => {
  setCloudApiTokenInMemory(token);
  invalidateRequestCache();
};

export const clearApiToken = () => {
  setCloudApiTokenInMemory(null);
  invalidateRequestCache();
};
