import type { ServerStatus, ServerRegion, ServerStats, GameType } from '@/types';
import type { ViewMode } from '@/types/ui';
import type { CountryInfo } from '@/api/servers';
import { reconcileServerEntities } from '@/services/serverEntities';
import {
  CARD_MIN_WIDTH_DEFAULT,
  clampCardMinWidth,
  loadPersistedState,
} from './appPersist';
export {
  CARD_MIN_WIDTH_DEFAULT,
  CARD_MIN_WIDTH_MAX,
  CARD_MIN_WIDTH_MIN,
  CARD_MIN_WIDTH_STEP,
} from './appPersist';

export interface AppState {
  servers: ServerStatus[];
  totalServers: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  categories: string[];  // Changed to string array to match API response
  selectedCategory: string | null;
  searchQuery: string;
  selectedRegion: ServerRegion;
  selectedGameType: GameType;  // Game type filter: CS2 or CSGO
  selectedContinent: string;   // Continent filter: 'all' | 'AS' | 'EU' | 'NA' | 'SA' | 'OC' | 'AF'
  selectedGeoRegion: string;   // Geographic sub-region filter: 'all' | 'east_asia' | 'west_europe' etc.
  selectedCountry: string;     // Country filter by country_code: 'all' | 'US' | 'CN' etc.
  stats: ServerStats | null;
  apiBaseUrl: string;
  favorites: string[];
  viewMode: ViewMode;
  perPage: number;
  cardMinWidth: number;
  // Filter metadata from /api/servers/metadata (global country/map data)
  metadataCountries: CountryInfo[];
  metadataMaps: string[];
}

// Filter parameters type - passed to fetchServers to avoid race conditions
export interface FetchFilters {
  searchQuery?: string;
  selectedCategory?: string | null;
  selectedRegion?: ServerRegion;
  selectedGameType?: GameType;
  selectedContinent?: string;
  selectedGeoRegion?: string;
  selectedCountry?: string;
  perPage?: number;
}

/** Options that control how fetchServers behaves. */
export interface FetchOptions {
  /** When true the fetch runs silently: no loading spinner, no prefetch cancellation, and errors are swallowed. */
  silent?: boolean;
}

// Action types
export type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SERVERS'; payload: { servers: ServerStatus[]; total: number; page: number; totalPages: number } }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_STATS'; payload: ServerStats }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_REGION'; payload: ServerRegion }
  | { type: 'SET_GAME_TYPE'; payload: GameType }
  | { type: 'SET_CONTINENT'; payload: string }
  | { type: 'SET_GEO_REGION'; payload: string }
  | { type: 'SET_COUNTRY'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string | null }
  | { type: 'SET_API_URL'; payload: string }
  | { type: 'ADD_FAVORITE'; payload: string }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'SET_FAVORITES'; payload: string[] }
  | { type: 'REORDER_FAVORITES'; payload: { from: number; to: number } }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_PER_PAGE'; payload: number }
  | { type: 'SET_CARD_MIN_WIDTH'; payload: number }
  | { type: 'SET_METADATA'; payload: { countries: CountryInfo[]; maps: string[] } };

// Initial state
export const initialState: AppState = {
  servers: [],
  totalServers: 0,
  currentPage: 1,
  totalPages: 0,
  isLoading: false,
  error: null,
  categories: [],
  selectedCategory: null,
  searchQuery: '',
  selectedRegion: 'all',
  selectedGameType: 'cs2',  // Default to CS2
  selectedContinent: 'all',
  selectedGeoRegion: 'all',
  selectedCountry: 'all',
  stats: null,
  apiBaseUrl: 'https://servers.upkk.com',
  favorites: [],
  viewMode: 'card',
  perPage: 20,
  cardMinWidth: CARD_MIN_WIDTH_DEFAULT,
  metadataCountries: [],
  metadataMaps: [],
  ...loadPersistedState(),
};

// Reducer
export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SERVERS':
      return {
        ...state,
        servers: reconcileServerEntities(state.servers, action.payload.servers),
        totalServers: action.payload.total,
        currentPage: action.payload.page,
        totalPages: action.payload.totalPages,
        isLoading: false,
      };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload, currentPage: 1 };
    case 'SET_REGION':
      return { ...state, selectedRegion: action.payload, currentPage: 1, selectedCategory: null };
    case 'SET_GAME_TYPE':
      return { ...state, selectedGameType: action.payload, currentPage: 1 };
    case 'SET_CONTINENT':
      return { ...state, selectedContinent: action.payload, selectedGeoRegion: 'all', selectedCountry: 'all', currentPage: 1 };
    case 'SET_GEO_REGION':
      return { ...state, selectedGeoRegion: action.payload, selectedCountry: 'all', currentPage: 1 };
    case 'SET_COUNTRY':
      return { ...state, selectedCountry: action.payload, currentPage: 1 };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload, currentPage: 1, searchQuery: '' };
    case 'SET_API_URL':
      return { ...state, apiBaseUrl: action.payload };
    case 'ADD_FAVORITE':
      if (state.favorites.includes(action.payload)) return state;
      return { ...state, favorites: [...state.favorites, action.payload] };
    case 'REMOVE_FAVORITE':
      return { ...state, favorites: state.favorites.filter(f => f !== action.payload) };
    case 'SET_FAVORITES':
      return { ...state, favorites: [...new Set([...state.favorites, ...action.payload])] };
    case 'REORDER_FAVORITES': {
      const { from, to } = action.payload;
      if (from < 0 || from >= state.favorites.length || to < 0 || to >= state.favorites.length) return state;
      const reordered = [...state.favorites];
      [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
      return { ...state, favorites: reordered };
    }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_PER_PAGE':
      return { ...state, perPage: action.payload, currentPage: 1 };
    case 'SET_CARD_MIN_WIDTH':
      return { ...state, cardMinWidth: clampCardMinWidth(action.payload) };
    case 'SET_METADATA':
      return { ...state, metadataCountries: action.payload.countries, metadataMaps: action.payload.maps };
    default:
      return state;
  }
}
