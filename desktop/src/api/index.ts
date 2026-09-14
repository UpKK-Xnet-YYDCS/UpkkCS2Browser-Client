export {
  XPROJ_USER_AGENT,
  getBaseUrl,
  getApiBaseUrl,
  getApiToken,
  setApiBaseUrl,
  setApiToken,
  clearApiToken,
  buildQuery,
  clearResponseCache,
  clearCacheForEndpoint,
  hasCachedResponse,
  getPrefetchDelay,
  setPrefetchDelay,
  getPrefetchPages,
  setPrefetchPages,
  cancelPrefetch,
  fetchApi,
  fetchWithRetry,
  refreshEndpoint,
} from './client.ts';
export type { GeoFilterParams, ApiCallOptions } from './client.ts';

export type { PrefetchParams } from './servers.ts';
export type { CountryInfo, ServerFilterMetadata } from './servers.ts';
export {
  buildServerListEndpoint,
  prefetchServerPages,
  getServers,
  getServersEnhanced,
  searchServers,
  getServersByCategory,
  getTop50Servers,
  getServerDetail,
  getServerPlayers,
  getServerStats,
  refreshServer,
  getCategories,
  getStats,
  getServerMetadata,
} from './servers.ts';

export type { UserInfo, AuthStatus } from './auth.ts';
export {
  checkAuthStatus,
  getSteamLoginUrl,
  getGoogleLoginUrl,
  getDiscordLoginUrl,
  getUpkkLoginUrl,
  logout,
} from './auth.ts';

export type { FavoriteServer, FavoriteListResponse } from './favorites.ts';
export {
  getFavorites,
  getAllFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  updateFavoriteSortOrder,
} from './favorites.ts';

export type {
  PlayerHistoryStat,
  PlayerHistoryResponse,
  MapHistoryItem,
  MapSessionRecord,
  MapHistoryResponse,
  A2SQueryDebugRecord,
  A2SLatencyStatPoint,
  A2SDebugResponse,
} from './history.ts';
export {
  getServerPlayerHistory,
  getServerMapHistory,
  getA2SDebug,
} from './history.ts';
