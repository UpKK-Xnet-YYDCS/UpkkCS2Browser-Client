import type { GameType, ServerRegion, ServerStats } from '@/types';
import { buildQuery, fetchWithRetry } from './client';
import { gameQueryValue } from './serverQuery';

export interface CountryInfo {
  code: string;
  name: string;
  count: number;
}

export interface ServerFilterMetadata {
  countries: CountryInfo[];
  maps: string[];
}

export const getCategories = async (): Promise<string[]> => {
  const response = await fetchWithRetry<{ categories: string[] }>('/api/categories');
  return response.categories || [];
};

export const getStats = async (): Promise<ServerStats> => {
  return fetchWithRetry('/api/stats');
};

export const getServerMetadata = async (
  region: ServerRegion = 'all',
  game?: GameType,
  category?: string
): Promise<ServerFilterMetadata> => {
  const query = buildQuery({
    region,
    game: gameQueryValue(game),
    category: category || undefined,
  });
  return fetchWithRetry(`/api/servers/metadata${query}`);
};
