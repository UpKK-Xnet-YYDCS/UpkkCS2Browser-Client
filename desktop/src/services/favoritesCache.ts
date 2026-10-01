import { clearCacheForEndpoint } from '../api/clientCache.ts';

export const favoritesResponseCacheKey = '/api/favorites';

export function clearFavoritesResponseCache(
  clear: (endpointSubstring: string) => void = clearCacheForEndpoint,
): void {
  clear(favoritesResponseCacheKey);
}
