import { createContext } from 'react';
import type { ServerRegion, GameType } from '@/types';
import type { ViewMode } from '@/types/ui';
import type { AppState, FetchFilters, FetchOptions } from './appState';

export interface AppContextType extends AppState {
  fetchServers: (page?: number, filters?: FetchFilters, options?: FetchOptions) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchMetadata: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedRegion: (region: ServerRegion) => void;
  setSelectedGameType: (gameType: GameType) => void;
  setSelectedContinent: (continent: string) => void;
  setSelectedGeoRegion: (geoRegion: string) => void;
  setSelectedCountry: (country: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setApiBaseUrl: (url: string) => void;
  addFavorite: (addr: string) => void;
  removeFavorite: (addr: string) => void;
  importFavorites: (addrs: string[]) => void;
  reorderFavorites: (from: number, to: number) => void;
  isFavorite: (addr: string) => boolean;
  clearError: () => void;
  setViewMode: (mode: ViewMode) => void;
  setPerPage: (perPage: number) => void;
  setCardMinWidth: (width: number) => void;
}

export type ServerDataStore = Pick<AppContextType,
  'servers' | 'totalServers' | 'currentPage' | 'totalPages' | 'isLoading' | 'error' |
  'categories' | 'stats' | 'metadataCountries' | 'metadataMaps'
>;
export type ServerFiltersStore = Pick<AppContextType,
  'searchQuery' | 'selectedCategory' | 'selectedRegion' | 'selectedGameType' |
  'selectedContinent' | 'selectedGeoRegion' | 'selectedCountry'
>;
export type AppPreferencesStore = Pick<AppContextType,
  'apiBaseUrl' | 'viewMode' | 'perPage' | 'cardMinWidth'
>;
export type AppActionsStore = Pick<AppContextType,
  'fetchServers' | 'fetchCategories' | 'fetchStats' | 'fetchMetadata' |
  'setSearchQuery' | 'setSelectedRegion' | 'setSelectedGameType' |
  'setSelectedContinent' | 'setSelectedGeoRegion' | 'setSelectedCountry' |
  'setSelectedCategory' | 'setApiBaseUrl' | 'clearError' | 'setViewMode' |
  'setPerPage' | 'setCardMinWidth'
>;

export const ServerDataContext = createContext<ServerDataStore | null>(null);
export const ServerFiltersContext = createContext<ServerFiltersStore | null>(null);
export const AppPreferencesContext = createContext<AppPreferencesStore | null>(null);
export const AppActionsContext = createContext<AppActionsStore | null>(null);

export interface FavoritesContextType {
  favorites: string[];
  addFavorite: (address: string) => void;
  removeFavorite: (address: string) => void;
  importFavorites: (addresses: string[]) => void;
  reorderFavorites: (from: number, to: number) => void;
  isFavorite: (address: string) => boolean;
}

export const FavoritesContext = createContext<FavoritesContextType | null>(null);

export interface FavoriteAddressContextType {
  subscribe: (address: string, listener: () => void) => () => void;
  isFavorite: (address: string) => boolean;
  addFavorite: (address: string) => void;
  removeFavorite: (address: string) => void;
}

export const FavoriteAddressContext = createContext<FavoriteAddressContextType | null>(null);
