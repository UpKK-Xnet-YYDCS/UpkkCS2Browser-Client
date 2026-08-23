import type { GameType, ServerRegion } from '@/types';
import { buildQuery, type GeoFilterParams } from './clientQuery.ts';

export type { GeoFilterParams };

export function geoQueryFields(geoFilter?: GeoFilterParams) {
  return {
    continent: geoFilter?.continent && geoFilter.continent !== 'all' ? geoFilter.continent : undefined,
    geo_region: geoFilter?.geo_region && geoFilter.geo_region !== 'all' ? geoFilter.geo_region : undefined,
    country: geoFilter?.country && geoFilter.country !== 'all' ? geoFilter.country : undefined,
  };
}

export function gameQueryValue(game?: GameType) {
  return game === 'all' ? undefined : game;
}

export function buildServerListEndpoint(params: {
  searchQuery?: string;
  selectedCategory?: string | null;
  selectedRegion?: ServerRegion;
  selectedGameType?: GameType;
  page?: number;
  perPage?: number;
  geoFilter?: GeoFilterParams;
}): string {
  const { searchQuery, selectedCategory, selectedRegion, selectedGameType, page, perPage, geoFilter } = params;
  const game = gameQueryValue(selectedGameType);
  const geo = geoQueryFields(geoFilter);

  if (searchQuery) {
    return `/api/servers/search${buildQuery({ q: searchQuery, region: selectedRegion, page, per_page: perPage, game, ...geo })}`;
  }
  if (selectedCategory) {
    return `/api/servers/by-category${buildQuery({ category: selectedCategory, region: selectedRegion, page, per_page: perPage, game, ...geo })}`;
  }
  return `/api/servers${buildQuery({ region: selectedRegion, page, per_page: perPage, game, ...geo })}`;
}
