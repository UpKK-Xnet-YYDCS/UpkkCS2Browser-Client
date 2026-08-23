import { setCloudApiTokenInMemory } from '@/services/cloudToken';
import { invalidateRequestCache } from './clientCache';
import { getBaseUrl, writeApiBaseUrl } from './clientConfig';

export {
  XPROJ_USER_AGENT,
  getBaseUrl,
  getApiBaseUrl,
  getApiToken,
} from './clientConfig';
export { buildQuery } from './clientQuery';
export type { GeoFilterParams } from './clientQuery';

export {
  clearResponseCache,
  clearCacheForEndpoint,
  hasCachedResponse,
} from './clientCache';

export {
  getPrefetchDelay,
  setPrefetchDelay,
  getPrefetchPages,
  setPrefetchPages,
  cancelPrefetch,
  startPrefetchSequence,
  isPrefetchSequenceCurrent,
} from './clientPrefetch';

export {
  fetchApi,
  fetchWithRetry,
  refreshEndpoint,
} from './clientRequest';

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
