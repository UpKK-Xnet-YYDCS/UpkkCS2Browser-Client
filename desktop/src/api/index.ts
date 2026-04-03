import type { 
  ServerStatus, 
  ServerDetail, 
  ServerStats, 
  PaginatedResponse,
  SearchResponse,
  ServerRegion,
  GameType
} from '@/types';
import { logInfo, logWarn, logError, logDebug } from '@/store/log';

// Compile-time User-Agent for HTTP POST requests (configurable via XPROJ_HTTP_USER_AGENT env var)
// Default: 'XProj-Desktop-HTTP/<version> (+https://servers.upkk.com)' where <version> is read from version.txt
export const XPROJ_USER_AGENT = __XPROJ_HTTP_USER_AGENT__;

// Cache the base URL in a module-level variable for performance
let cachedBaseUrl: string | null = null;

// Get API base URL from cache or localStorage
const getBaseUrl = (): string => {
  if (cachedBaseUrl === null) {
    cachedBaseUrl = localStorage.getItem('apiBaseUrl') || 'https://servers.upkk.com';
  }
  return cachedBaseUrl;
};

// Set API base URL (updates both cache and localStorage)
export const setApiBaseUrl = (url: string) => {
  cachedBaseUrl = url;
  localStorage.setItem('apiBaseUrl', url);
};

// Get current API base URL
export const getApiBaseUrl = (): string => {
  return getBaseUrl();
};

// API token storage key
const API_TOKEN_KEY = 'xproj_api_token';

// Get stored API token
export const getApiToken = (): string | null => {
  try {
    return localStorage.getItem(API_TOKEN_KEY);
  } catch { return null; }
};

// Set API token
export const setApiToken = (token: string) => {
  try {
    localStorage.setItem(API_TOKEN_KEY, token);
  } catch { /* ignore */ }
};

// Clear API token
export const clearApiToken = () => {
  try {
    localStorage.removeItem(API_TOKEN_KEY);
  } catch { /* ignore */ }
};

// Custom error class that carries HTTP status code for structured error handling
class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// --- In-flight request deduplication ---
// Prevents duplicate concurrent requests to the same endpoint
const inflightRequests = new Map<string, Promise<unknown>>();

// --- Short-TTL response cache for GET requests ---
// Reduces redundant network calls for slowly-changing data (stats, categories, metadata).
// TTL is derived from the user-configured auto-refresh interval so that cached data
// never outlives a single refresh cycle. Falls back to 60 s when no interval is saved.
const DEFAULT_CACHE_TTL_MS = 60_000; // 60 seconds

function getCacheTtlMs(): number {
  try {
    const saved = localStorage.getItem('autoRefreshInterval');
    if (saved) {
      const seconds = parseInt(saved, 10);
      if (seconds > 0) return seconds * 1000;
    }
  } catch { /* ignore */ }
  return DEFAULT_CACHE_TTL_MS;
}

interface CacheEntry { data: unknown; ts: number }
const responseCache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | undefined {
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.ts < getCacheTtlMs()) {
    return entry.data as T;
  }
  if (entry) responseCache.delete(key);
  return undefined;
}

function setCache(key: string, data: unknown): void {
  responseCache.set(key, { data, ts: Date.now() });
}

/** Clear all cached API responses so the next request fetches fresh data. */
export function clearResponseCache(): void {
  responseCache.clear();
}

// --- Page prefetch support ---
// Silently fetches upcoming server list pages into the response cache
// so that page navigation feels instant.

const PREFETCH_DELAY_MS = 300; // Delay between sequential prefetch requests
const PREFETCH_PAGES_KEY = 'prefetchPages';
const DEFAULT_PREFETCH_PAGES = 5;

let prefetchVersion = 0;

/** Get the configured number of pages to prefetch (0 = disabled, default = 5). */
export function getPrefetchPages(): number {
  try {
    const saved = localStorage.getItem(PREFETCH_PAGES_KEY);
    if (saved !== null) {
      const n = parseInt(saved, 10);
      return isNaN(n) || n < 0 ? DEFAULT_PREFETCH_PAGES : n;
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFETCH_PAGES;
}

/** Set the number of pages to prefetch (0 = disabled). */
export function setPrefetchPages(n: number): void {
  localStorage.setItem(PREFETCH_PAGES_KEY, String(Math.max(0, Math.floor(n))));
}

/** Cancel any in-progress prefetch sequence. */
export function cancelPrefetch(): void {
  prefetchVersion++;
}

/** Parameters for prefetching server list pages. */
export interface PrefetchParams {
  currentPage: number;
  totalPages: number;
  searchQuery?: string;
  selectedCategory?: string | null;
  selectedRegion?: ServerRegion;
  selectedGameType?: GameType;
  perPage?: number;
  geoFilter?: GeoFilterParams;
}

/**
 * Prefetch upcoming server list pages into the response cache.
 * Fetches pages sequentially with a short delay to avoid overloading the server.
 * Automatically cancelled when a new prefetch or cancelPrefetch() is called.
 */
export function prefetchServerPages(params: PrefetchParams): void {
  const count = getPrefetchPages();
  if (count <= 0) return;

  const version = ++prefetchVersion;
  const { currentPage, totalPages, searchQuery, selectedCategory, selectedRegion, selectedGameType, perPage, geoFilter } = params;

  // Calculate pages to prefetch (next N pages after current)
  const pagesToFetch: number[] = [];
  for (let i = 1; i <= count && currentPage + i <= totalPages; i++) {
    pagesToFetch.push(currentPage + i);
  }

  if (pagesToFetch.length === 0) return;

  logDebug('Prefetch', `Queued pages ${pagesToFetch.join(', ')} (from page ${currentPage})`);

  // Sequentially prefetch with delay between requests
  (async () => {
    for (const page of pagesToFetch) {
      // Check if this prefetch sequence is still valid
      if (prefetchVersion !== version) {
        logDebug('Prefetch', 'Cancelled (superseded)');
        return;
      }

      try {
        if (searchQuery) {
          await searchServers(searchQuery, selectedRegion, page, perPage, selectedGameType, geoFilter);
        } else if (selectedCategory) {
          await getServersByCategory(selectedCategory, selectedRegion, page, perPage, selectedGameType, geoFilter);
        } else {
          await getServers(selectedRegion, page, perPage, selectedGameType, geoFilter);
        }
        logDebug('Prefetch', `Page ${page} cached`);
      } catch {
        // Silently ignore prefetch errors — they are non-critical
        logDebug('Prefetch', `Page ${page} failed (ignored)`);
      }

      // Delay before next prefetch to keep rate gentle
      if (prefetchVersion !== version) return;
      await new Promise(r => setTimeout(r, PREFETCH_DELAY_MS));
      if (prefetchVersion !== version) {
        logDebug('Prefetch', 'Cancelled after delay (superseded)');
        return;
      }
    }
  })();
}

// Generic fetch wrapper with detailed error handling and in-flight deduplication.
// Uses Tauri HTTP plugin for better CORS support, falls back to regular fetch.
// Automatically includes API token in Authorization header if available.
// GET requests are deduplicated: concurrent identical requests share a single Promise.
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  
  // Only deduplicate GET requests (safe to share)
  if (method === 'GET') {
    const dedupeKey = endpoint;
    const inflight = inflightRequests.get(dedupeKey) as Promise<T> | undefined;
    if (inflight) return inflight;
    
    const promise = fetchApiImpl<T>(endpoint, options);
    inflightRequests.set(dedupeKey, promise);
    try {
      return await promise;
    } finally {
      inflightRequests.delete(dedupeKey);
    }
  }
  
  return fetchApiImpl<T>(endpoint, options);
}

// Internal fetch implementation (separated from deduplication wrapper)
async function fetchApiImpl<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const method = options?.method || 'GET';
  logInfo('API', `${method} ${endpoint}`);
  logDebug('API', `${method} ${url}`);
  
  // Build headers with optional API token
  const token = getApiToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    // Try using Tauri HTTP plugin first (bypasses CORS restrictions)
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const response = await tauriFetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-UA': XPROJ_USER_AGENT,
          ...authHeaders,
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new ApiError(`API请求失败: ${url} - 状态码: ${response.status} ${response.statusText}${errorText ? ` - 响应: ${errorText.substring(0, 200)}` : ''}`, response.status);
      }
      
      const data = await response.json();
      logDebug('API', '响应成功');
      return data;
    } catch (tauriErr) {
      // Only fall back to regular fetch if Tauri module is not available
      const errMsg = tauriErr instanceof Error ? tauriErr.message : String(tauriErr);
      const isModuleError = errMsg.includes('module') || 
                            errMsg.includes('import') || 
                            errMsg.includes('Cannot find') ||
                            errMsg.includes('Failed to resolve');
      
      if (!isModuleError) {
        // This is an actual request error, not a module loading error - throw it
        throw tauriErr;
      }
      logDebug('API', 'Tauri HTTP 不可用, 回退到 fetch...');
    }
    
    // Fallback to regular fetch (may fail due to CORS in browser environments)
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': XPROJ_USER_AGENT,
        'X-Client-UA': XPROJ_USER_AGENT,
        ...authHeaders,
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new ApiError(`API请求失败: ${url} - 状态码: ${response.status} ${response.statusText}${errorText ? ` - 响应: ${errorText.substring(0, 200)}` : ''}`, response.status);
    }
    
    const data = await response.json();
    logDebug('API', '响应成功');
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const msg = `Network error: ${endpoint}`;
      logError('API', msg);
      throw new Error(`网络请求失败: ${url} - 无法连接到服务器。请检查网络连接和API地址配置。当前API地址: ${baseUrl}`);
    }
    if (error instanceof ApiError) {
      logError('API', `${method} ${endpoint} → ${error.status}`);
    }
    throw error;
  }
}

// Check if an error is retryable (network errors and server errors, not client errors)
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // Network errors
  if (error instanceof ApiError) {
    // Retry on 5xx server errors, don't retry on 4xx client errors
    return error.status >= 500;
  }
  return true;
}

// Fetch with exponential backoff retry (up to 3 attempts)
// Only retries on network errors and server errors (5xx), not client errors (4xx)
// GET requests are cached with a short TTL to reduce redundant network calls
async function fetchWithRetry<T>(endpoint: string, options?: RequestInit, maxRetries = 3): Promise<T> {
  const method = options?.method || 'GET';
  
  // Check TTL cache for GET requests
  if (method === 'GET') {
    const cached = getCached<T>(endpoint);
    if (cached !== undefined) return cached;
  }
  
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fetchApi<T>(endpoint, options);
      // Cache successful GET responses
      if (method === 'GET') setCache(endpoint, result);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        logWarn('API', `Retry ${attempt + 1}/${maxRetries} ${endpoint}`);
        logWarn('API', `Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

// Build query string from params
function buildQuery(params: Record<string, string | number | undefined>): string {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return filtered.length ? `?${filtered.join('&')}` : '';
}

// Geographic filter parameters for server-side continent/region/country filtering
export interface GeoFilterParams {
  continent?: string;
  geo_region?: string;
  country?: string;
}

// Server filter metadata from /api/servers/metadata
export interface CountryInfo {
  code: string;
  name: string;
  count: number;
}

export interface ServerFilterMetadata {
  countries: CountryInfo[];
  maps: string[];
}

// Server APIs
export const getServers = async (
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams
): Promise<ServerStatus[] | PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({
    region, page, per_page: perPage, game: game === 'all' ? undefined : game,
    continent: geoFilter?.continent && geoFilter.continent !== 'all' ? geoFilter.continent : undefined,
    geo_region: geoFilter?.geo_region && geoFilter.geo_region !== 'all' ? geoFilter.geo_region : undefined,
    country: geoFilter?.country && geoFilter.country !== 'all' ? geoFilter.country : undefined,
  });
  return fetchWithRetry(`/api/servers${query}`);
};

// Enhanced server list with more data
export const getServersEnhanced = async (
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number
): Promise<PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({ region, page, per_page: perPage });
  return fetchWithRetry(`/api/servers/enhanced${query}`);
};

// Search servers
export const searchServers = async (
  q: string,
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams
): Promise<SearchResponse> => {
  const query = buildQuery({
    q, region, page, per_page: perPage, game: game === 'all' ? undefined : game,
    continent: geoFilter?.continent && geoFilter.continent !== 'all' ? geoFilter.continent : undefined,
    geo_region: geoFilter?.geo_region && geoFilter.geo_region !== 'all' ? geoFilter.geo_region : undefined,
    country: geoFilter?.country && geoFilter.country !== 'all' ? geoFilter.country : undefined,
  });
  return fetchWithRetry(`/api/servers/search${query}`);
};

// Get server details
export const getServerDetail = async (id: number | string): Promise<ServerDetail> => {
  return fetchApi(`/api/server/${id}/info`);
};

// Get server players
export const getServerPlayers = async (id: number | string) => {
  return fetchApi(`/api/server/${id}/players`);
};

// Get server stats
export const getServerStats = async (id: number | string) => {
  return fetchApi(`/api/server/${id}/stats`);
};

// Refresh server info
export const refreshServer = async (id: number | string) => {
  return fetchApi(`/api/server/${id}/refresh`, { method: 'POST' });
};

// Get categories
// API returns { categories: string[] } - an array of category name strings
export const getCategories = async (): Promise<string[]> => {
  const response = await fetchWithRetry<{ categories: string[] }>('/api/categories');
  return response.categories || [];
};

// Get servers by category
export const getServersByCategory = async (
  category: string,
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams
): Promise<PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({
    category, region, page, per_page: perPage, game: game === 'all' ? undefined : game,
    continent: geoFilter?.continent && geoFilter.continent !== 'all' ? geoFilter.continent : undefined,
    geo_region: geoFilter?.geo_region && geoFilter.geo_region !== 'all' ? geoFilter.geo_region : undefined,
    country: geoFilter?.country && geoFilter.country !== 'all' ? geoFilter.country : undefined,
  });
  return fetchWithRetry(`/api/servers/by-category${query}`);
};

// Get global stats
export const getStats = async (): Promise<ServerStats> => {
  return fetchWithRetry('/api/stats');
};

// Get server filter metadata (country stats + map names) from all servers
export const getServerMetadata = async (
  region: ServerRegion = 'all',
  game?: GameType,
  category?: string
): Promise<ServerFilterMetadata> => {
  const query = buildQuery({
    region,
    game: game === 'all' ? undefined : game,
    category: category || undefined,
  });
  return fetchWithRetry(`/api/servers/metadata${query}`);
};

// Get top 50 online servers
export const getTop50Servers = async (): Promise<ServerStatus[]> => {
  return fetchWithRetry('/api/servers/top50');
};

// Server player history stats for chart
export interface PlayerHistoryStat {
  timestamp: string;
  real_players: number;
  bots: number;
  players?: number;
}

export interface PlayerHistoryResponse {
  ip: string;
  port: string;
  period: string;
  stats: PlayerHistoryStat[];
}

// Get server player history for chart
export const getServerPlayerHistory = async (
  serverId: string,
  period: string = '24h'
): Promise<PlayerHistoryResponse> => {
  return fetchWithRetry(`/api/server/${serverId}/stats?period=${period}`);
};

// ============== User Authentication ==============

export interface UserInfo {
  id: number;
  steam_id?: string;
  username: string;
  avatar?: string;
  provider: 'steam' | 'google' | 'discord' | 'upkk';
}

export interface AuthStatus {
  logged_in: boolean;
  user?: UserInfo;
}

// Check login status
export const checkAuthStatus = async (): Promise<AuthStatus> => {
  try {
    return await fetchApi('/api/auth/user');
  } catch {
    return { logged_in: false };
  }
};

// Get login URL for Steam (opens in browser)
export const getSteamLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/steam/login?desktop=1`;
};

// Get login URL for Google OAuth (opens in browser)
export const getGoogleLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/google/login?desktop=1`;
};

// Get login URL for Discord OAuth (opens in browser)
export const getDiscordLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/discord/login?desktop=1`;
};

// Get login URL for Upkk forum OAuth (opens in browser)
export const getUpkkLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/upkk/login?desktop=1`;
};

// Logout current user
export const logout = async (): Promise<void> => {
  // Clear the API token
  clearApiToken();
  
  const baseUrl = getBaseUrl();
  try {
    // Try Tauri HTTP plugin first
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      await tauriFetch(`${baseUrl}/auth/logout`, {
        headers: {
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-UA': XPROJ_USER_AGENT,
        },
      });
    } catch (tauriErr) {
      const errMsg = tauriErr instanceof Error ? tauriErr.message : String(tauriErr);
      const isModuleError = errMsg.includes('module') || errMsg.includes('import') || errMsg.includes('Cannot find') || errMsg.includes('Failed to resolve');
      if (!isModuleError) throw tauriErr;
      // Fallback to regular fetch
      await fetch(`${baseUrl}/auth/logout`, {
        headers: {
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-UA': XPROJ_USER_AGENT,
        },
      });
    }
  } catch {
    // Ignore logout errors
  }
};

// ============== Favorites API (Cloud Storage) ==============

export interface FavoriteServer {
  id: number;
  server_ip: string;
  server_port: string;
  server_name: string;
  added_at: string;
  notes?: string;
  sort_order?: number;
  // Extended fields from server status
  current_name?: string;
  players?: number;
  current_players?: number;
  max_players?: number;
  real_players?: number;
  bots?: number;
  map_name?: string;
  map_image_url?: string;  // Map preview image URL
  game?: string;
  category?: string;
  is_online?: boolean;
  online?: boolean;
  country_code?: string;
  country_name?: string;
  priority?: number;
  last_updated?: string;
}

export interface FavoriteListResponse {
  success?: boolean;
  favorites: FavoriteServer[];
  total: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
}

// Get user's favorite servers list with optional pagination
export const getFavorites = async (page?: number, perPage?: number): Promise<FavoriteListResponse> => {
  const query = buildQuery({ page, per_page: perPage });
  return fetchWithRetry(`/api/favorites/list${query}`);
};

// Fetch ALL favorites using server-side pagination to avoid truncation
// Accumulates results across pages; returns total from the API
export const getAllFavorites = async (perPage = 100): Promise<FavoriteListResponse> => {
  const firstPage = await getFavorites(1, perPage);
  const total = firstPage.total;
  const totalPages = firstPage.total_pages ?? Math.ceil(total / perPage);

  if (totalPages <= 1) {
    return firstPage;
  }

  // Fetch remaining pages in parallel
  const remaining = Array.from({ length: totalPages - 1 }, (_, i) => getFavorites(i + 2, perPage));
  const pages = await Promise.all(remaining);

  const allFavorites = [
    ...firstPage.favorites,
    ...pages.flatMap(p => p.favorites),
  ];

  return { success: true, favorites: allFavorites, total, page: 1, per_page: perPage, total_pages: 1 };
};

// Add server to favorites
export const addFavorite = async (
  serverIp: string,
  serverPort: string,
  serverName: string,
  notes?: string
): Promise<{ success: boolean; message?: string }> => {
  return fetchApi('/api/favorites/add', {
    method: 'POST',
    body: JSON.stringify({
      server_ip: serverIp,
      server_port: serverPort,
      server_name: serverName,
      notes: notes || '',
    }),
  });
};

// Remove server from favorites
export const removeFavorite = async (
  serverIp: string,
  serverPort: string
): Promise<{ success: boolean; message?: string }> => {
  return fetchApi('/api/favorites/remove', {
    method: 'POST',
    body: JSON.stringify({
      server_ip: serverIp,
      server_port: serverPort,
    }),
  });
};

// Check if a server is favorited
export const checkFavorite = async (
  serverIp: string,
  serverPort: string
): Promise<{ is_favorite: boolean }> => {
  const query = buildQuery({ ip: serverIp, port: serverPort });
  return fetchApi(`/api/favorites/check${query}`);
};

// Update sort order of favorites
export const updateFavoriteSortOrder = async (
  orders: Array<{ server_ip: string; server_port: string; sort_order: number }>
): Promise<{ success: boolean; message?: string }> => {
  return fetchApi('/api/favorites/sort-order', {
    method: 'POST',
    body: JSON.stringify(orders),
  });
};

// ============== Map History API ==============

export interface MapHistoryItem {
  map_name: string;
  timestamp: string; // API returns "timestamp" field, e.g. "2026-01-31T12:51:56.231+08:00"
  started_at?: string; // Alternative field name
  ended_at?: string;
  duration_seconds?: number;
}

// MapSessionRecord represents a map session with duration and player count history
export interface MapSessionRecord {
  start_time: string;
  end_time: string;
  map_name: string;
  duration_secs: number;
  avg_players: number;
  max_players: number;
  min_players: number;
  player_history: number[]; // Player count samples for mini chart
  bot_history: number[];    // Bot count samples for mini chart
}

export interface MapHistoryResponse {
  server_id: string;
  history: MapHistoryItem[];
  sessions?: MapSessionRecord[]; // Enhanced session data with player history
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// Get server map history
// API format: /api/server/地址:端口/maphistory?page=1&per_page=30
export const getServerMapHistory = async (
  serverAddress: string, // e.g. "cs2ze.upkk.com:27015"
  page: number = 1,
  perPage: number = 30
): Promise<MapHistoryResponse> => {
  const query = buildQuery({ page, per_page: perPage });
  return fetchWithRetry(`/api/server/${serverAddress}/maphistory${query}`);
};

// ============== A2S Debug / Query Records API ==============

export interface A2SQueryDebugRecord {
  timestamp: number;
  query_time: string;
  node_name: string;
  is_from_node: boolean;
  success: boolean;
  duration_ms: number;
  a2s_data: Record<string, unknown>;
  error_message: string;
}

export interface A2SLatencyStatPoint {
  timestamp: number;
  avg_latency: number;
  max_latency: number;
  min_latency: number;
  query_count: number;
  success_count: number;
  node_name: string;
}

export interface A2SDebugResponse {
  success: boolean;
  ip: string;
  port: string;
  name?: string;
  records: A2SQueryDebugRecord[];
  stats: A2SLatencyStatPoint[];
  error?: string;
}

// Get A2S query debug records and latency stats for a server
export const getA2SDebug = async (serverAddress: string): Promise<A2SDebugResponse> => {
  return fetchWithRetry(`/api/server/${serverAddress}/a2s-debug`);
};
