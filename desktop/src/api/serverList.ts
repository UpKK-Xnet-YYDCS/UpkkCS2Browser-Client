import type {
  GameType,
  PaginatedResponse,
  SearchResponse,
  ServerRegion,
  ServerStatus,
} from '@/types';
import { logDebug } from '@/services/operationLog';
import { delayWithSignal } from './clientAbort.ts';
import type { ApiCallOptions } from './client';
import {
  buildQuery,
  collectPrefetchPageNumbers,
  fetchWithRetry,
  getPrefetchDelay,
  getPrefetchPages,
  isPrefetchSequenceCurrent,
  startPrefetchSequence,
  type GeoFilterParams,
} from './client';
import { buildServerListEndpoint, gameQueryValue, geoQueryFields } from './serverQuery';

export type { GeoFilterParams };
export { buildServerListEndpoint };

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

export function prefetchServerPages(params: PrefetchParams): void {
  const count = getPrefetchPages();
  if (count <= 0) return;

  const { version, signal } = startPrefetchSequence();
  const { currentPage, totalPages, searchQuery, selectedCategory, selectedRegion, selectedGameType, perPage, geoFilter } = params;

  const pagesToFetch = collectPrefetchPageNumbers(currentPage, totalPages, count);

  if (pagesToFetch.length === 0) return;

  logDebug('Prefetch', `Queued pages ${pagesToFetch.join(', ')} (from page ${currentPage})`);

  const callOptions: ApiCallOptions = { signal };
  (async () => {
    for (const page of pagesToFetch) {
      if (!isPrefetchSequenceCurrent(version) || signal.aborted) {
        logDebug('Prefetch', 'Cancelled (superseded)');
        return;
      }

      try {
        if (searchQuery) {
          await searchServers(searchQuery, selectedRegion, page, perPage, selectedGameType, geoFilter, callOptions);
        } else if (selectedCategory) {
          await getServersByCategory(selectedCategory, selectedRegion, page, perPage, selectedGameType, geoFilter, callOptions);
        } else {
          await getServers(selectedRegion, page, perPage, selectedGameType, geoFilter, callOptions);
        }
        logDebug('Prefetch', `Page ${page} cached`);
      } catch {
        if (signal.aborted) return;
        logDebug('Prefetch', `Page ${page} failed (ignored)`);
      }

      if (!isPrefetchSequenceCurrent(version) || signal.aborted) return;
      try {
        await delayWithSignal(getPrefetchDelay(), signal);
      } catch {
        logDebug('Prefetch', 'Cancelled after delay (superseded)');
        return;
      }
      if (!isPrefetchSequenceCurrent(version) || signal.aborted) {
        logDebug('Prefetch', 'Cancelled after delay (superseded)');
        return;
      }
    }
  })();
}

export const getServers = async (
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams,
  options?: ApiCallOptions,
): Promise<ServerStatus[] | PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({
    region, page, per_page: perPage, game: gameQueryValue(game),
    ...geoQueryFields(geoFilter),
  });
  return fetchWithRetry(`/api/servers${query}`, { signal: options?.signal });
};

export const getServersEnhanced = async (
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  options?: ApiCallOptions,
): Promise<PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({ region, page, per_page: perPage });
  return fetchWithRetry(`/api/servers/enhanced${query}`, { signal: options?.signal });
};

export const searchServers = async (
  q: string,
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams,
  options?: ApiCallOptions,
): Promise<SearchResponse> => {
  const query = buildQuery({
    q, region, page, per_page: perPage, game: gameQueryValue(game),
    ...geoQueryFields(geoFilter),
  });
  return fetchWithRetry(`/api/servers/search${query}`, { signal: options?.signal });
};

export const getServersByCategory = async (
  category: string,
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams,
  options?: ApiCallOptions,
): Promise<PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({
    category, region, page, per_page: perPage, game: gameQueryValue(game),
    ...geoQueryFields(geoFilter),
  });
  return fetchWithRetry(`/api/servers/by-category${query}`, { signal: options?.signal });
};

export const getTop50Servers = async (options?: ApiCallOptions): Promise<ServerStatus[]> => {
  return fetchWithRetry('/api/servers/top50', { signal: options?.signal });
};
