import type {
  GameType,
  PaginatedResponse,
  SearchResponse,
  ServerRegion,
  ServerStatus,
} from '@/types';
import { logDebug } from '@/services/operationLog';
import {
  buildQuery,
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

  const version = startPrefetchSequence();
  const { currentPage, totalPages, searchQuery, selectedCategory, selectedRegion, selectedGameType, perPage, geoFilter } = params;

  const pagesToFetch: number[] = [];
  for (let i = 1; i <= count && currentPage + i <= totalPages; i++) {
    pagesToFetch.push(currentPage + i);
  }

  if (pagesToFetch.length === 0) return;

  logDebug('Prefetch', `Queued pages ${pagesToFetch.join(', ')} (from page ${currentPage})`);

  (async () => {
    for (const page of pagesToFetch) {
      if (!isPrefetchSequenceCurrent(version)) {
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
        logDebug('Prefetch', `Page ${page} failed (ignored)`);
      }

      if (!isPrefetchSequenceCurrent(version)) return;
      await new Promise(r => setTimeout(r, getPrefetchDelay()));
      if (!isPrefetchSequenceCurrent(version)) {
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
  geoFilter?: GeoFilterParams
): Promise<ServerStatus[] | PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({
    region, page, per_page: perPage, game: gameQueryValue(game),
    ...geoQueryFields(geoFilter),
  });
  return fetchWithRetry(`/api/servers${query}`);
};

export const getServersEnhanced = async (
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number
): Promise<PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({ region, page, per_page: perPage });
  return fetchWithRetry(`/api/servers/enhanced${query}`);
};

export const searchServers = async (
  q: string,
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams
): Promise<SearchResponse> => {
  const query = buildQuery({
    q, region, page, per_page: perPage, game: gameQueryValue(game),
    ...geoQueryFields(geoFilter),
  });
  return fetchWithRetry(`/api/servers/search${query}`);
};

export const getServersByCategory = async (
  category: string,
  region: ServerRegion = 'all',
  page?: number,
  perPage?: number,
  game?: GameType,
  geoFilter?: GeoFilterParams
): Promise<PaginatedResponse<ServerStatus>> => {
  const query = buildQuery({
    category, region, page, per_page: perPage, game: gameQueryValue(game),
    ...geoQueryFields(geoFilter),
  });
  return fetchWithRetry(`/api/servers/by-category${query}`);
};

export const getTop50Servers = async (): Promise<ServerStatus[]> => {
  return fetchWithRetry('/api/servers/top50');
};
