import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { ServerStatus, ServerRegion, ServerStats, GameType } from '@/types';
import type { ViewMode } from '@/components';
import type { CountryInfo } from '@/api';
import * as api from '@/api';

// State type
interface AppState {
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

// Action types
type Action =
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
  | { type: 'SET_METADATA'; payload: { countries: CountryInfo[]; maps: string[] } };

// Load persisted state
const loadPersistedState = (): Partial<AppState> => {
  try {
    const stored = localStorage.getItem('xproj-desktop-state');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        favorites: parsed.favorites || [],
        apiBaseUrl: parsed.apiBaseUrl || 'https://servers.upkk.com',
        selectedRegion: parsed.selectedRegion || 'all',
        selectedGameType: parsed.selectedGameType || 'cs2',  // Default to CS2
        selectedContinent: parsed.selectedContinent || 'all',
        selectedGeoRegion: parsed.selectedGeoRegion || 'all',
        selectedCountry: parsed.selectedCountry || 'all',
        viewMode: parsed.viewMode || 'card',
        perPage: parsed.perPage || 20,
      };
    }
  } catch (e) {
    console.error('Failed to load persisted state:', e);
  }
  return {};
};

// Initial state
const initialState: AppState = {
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
  metadataCountries: [],
  metadataMaps: [],
  ...loadPersistedState(),
};

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SERVERS':
      return {
        ...state,
        servers: action.payload.servers,
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
    case 'SET_METADATA':
      return { ...state, metadataCountries: action.payload.countries, metadataMaps: action.payload.maps };
    default:
      return state;
  }
}

// Context
interface AppContextType extends AppState {
  fetchServers: (page?: number, filters?: FetchFilters) => Promise<void>;
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
}

const AppContext = createContext<AppContextType | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Request version counter to handle race conditions
  // When a new request is made, increment the counter
  // When a response comes back, only apply it if the version matches
  const requestVersionRef = useRef(0);

  // Persist state changes with debounce to avoid excessive localStorage writes during rapid filter changes
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const toPersist = {
        favorites: state.favorites,
        apiBaseUrl: state.apiBaseUrl,
        selectedRegion: state.selectedRegion,
        selectedGameType: state.selectedGameType,
        selectedContinent: state.selectedContinent,
        selectedGeoRegion: state.selectedGeoRegion,
        selectedCountry: state.selectedCountry,
        viewMode: state.viewMode,
        perPage: state.perPage,
      };
      localStorage.setItem('xproj-desktop-state', JSON.stringify(toPersist));
    }, 500);
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [state.favorites, state.apiBaseUrl, state.selectedRegion, state.selectedGameType, state.selectedContinent, state.selectedGeoRegion, state.selectedCountry, state.viewMode, state.perPage]);

  // fetchServers accepts optional filter overrides to avoid race conditions with stale state
  // When filters parameter is provided, use those values instead of current state
  const fetchServers = useCallback(async (page = 1, filters?: FetchFilters) => {
    // Cancel any in-progress prefetch since we're fetching a new page
    api.cancelPrefetch();

    // Increment request version to invalidate any in-flight requests
    requestVersionRef.current += 1;
    const currentVersion = requestVersionRef.current;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    // Use provided filters or fall back to current state
    const searchQuery = filters?.searchQuery ?? state.searchQuery;
    const selectedCategory = filters?.selectedCategory !== undefined ? filters.selectedCategory : state.selectedCategory;
    const selectedRegion = filters?.selectedRegion ?? state.selectedRegion;
    const selectedGameType = filters?.selectedGameType ?? state.selectedGameType;
    const selectedContinent = filters?.selectedContinent ?? state.selectedContinent;
    const selectedGeoRegion = filters?.selectedGeoRegion ?? state.selectedGeoRegion;
    const selectedCountry = filters?.selectedCountry ?? state.selectedCountry;
    const perPage = filters?.perPage ?? state.perPage;
    
    // Build geo filter for server-side filtering
    const geoFilter: api.GeoFilterParams = {
      continent: selectedContinent,
      geo_region: selectedGeoRegion,
      country: selectedCountry,
    };
    
    try {
      let result;
      let resultPage = page;
      let resultTotalPages = 0;
      if (searchQuery) {
        result = await api.searchServers(searchQuery, selectedRegion, page, perPage, selectedGameType, geoFilter);
        
        // Check if this request is still the latest one - discard stale responses
        if (requestVersionRef.current !== currentVersion) {
          return;
        }
        
        resultPage = result.page || 1;
        resultTotalPages = result.total_pages || 0;
        dispatch({
          type: 'SET_SERVERS',
          payload: {
            servers: result.servers || [],
            total: result.count || 0,
            page: resultPage,
            totalPages: resultTotalPages,
          },
        });
      } else if (selectedCategory) {
        result = await api.getServersByCategory(selectedCategory, selectedRegion, page, perPage, selectedGameType, geoFilter);
        
        // Check if this request is still the latest one - discard stale responses
        if (requestVersionRef.current !== currentVersion) {
          return;
        }
        
        resultPage = result.page || 1;
        resultTotalPages = result.total_pages || 0;
        dispatch({
          type: 'SET_SERVERS',
          payload: {
            servers: result.servers || [],
            total: result.total || 0,
            page: resultPage,
            totalPages: resultTotalPages,
          },
        });
      } else {
        // The API returns an array directly, not a paginated object
        const servers = await api.getServers(selectedRegion, page, perPage, selectedGameType, geoFilter);
        
        // Check if this request is still the latest one - discard stale responses
        if (requestVersionRef.current !== currentVersion) {
          return;
        }
        
        // Handle both array response and paginated response
        if (Array.isArray(servers)) {
          resultPage = 1;
          resultTotalPages = 1;
          dispatch({
            type: 'SET_SERVERS',
            payload: {
              servers: servers,
              total: servers.length,
              page: 1,
              totalPages: 1,
            },
          });
        } else {
          resultPage = servers.page || 1;
          resultTotalPages = servers.total_pages || 0;
          dispatch({
            type: 'SET_SERVERS',
            payload: {
              servers: servers.servers || [],
              total: servers.total || 0,
              page: resultPage,
              totalPages: resultTotalPages,
            },
          });
        }
      }

      // Trigger background prefetch of upcoming pages
      api.prefetchServerPages({
        currentPage: resultPage,
        totalPages: resultTotalPages,
        searchQuery: searchQuery || undefined,
        selectedCategory,
        selectedRegion,
        selectedGameType,
        perPage,
        geoFilter,
      });
    } catch (error) {
      // Only dispatch error if this is still the latest request
      if (requestVersionRef.current !== currentVersion) {
        return;
      }
      
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '获取服务器列表失败',
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.searchQuery, state.selectedRegion, state.selectedCategory, state.selectedGameType, state.selectedContinent, state.selectedGeoRegion, state.selectedCountry, state.perPage]);

  const fetchCategories = useCallback(async () => {
    try {
      const categories = await api.getCategories();
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const stats = await api.getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Fetch global filter metadata (country stats + map names) for dropdown population
  const fetchMetadata = useCallback(async () => {
    try {
      const metadata = await api.getServerMetadata(
        state.selectedRegion,
        state.selectedGameType,
        state.selectedCategory || undefined
      );
      dispatch({ type: 'SET_METADATA', payload: { countries: metadata.countries || [], maps: metadata.maps || [] } });
    } catch (error) {
      console.error('Failed to fetch server metadata:', error);
    }
  }, [state.selectedRegion, state.selectedGameType, state.selectedCategory]);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setSelectedRegion = useCallback((region: ServerRegion) => {
    dispatch({ type: 'SET_REGION', payload: region });
  }, []);

  const setSelectedGameType = useCallback((gameType: GameType) => {
    dispatch({ type: 'SET_GAME_TYPE', payload: gameType });
  }, []);

  const setSelectedContinent = useCallback((continent: string) => {
    dispatch({ type: 'SET_CONTINENT', payload: continent });
  }, []);

  const setSelectedGeoRegion = useCallback((geoRegion: string) => {
    dispatch({ type: 'SET_GEO_REGION', payload: geoRegion });
  }, []);

  const setSelectedCountry = useCallback((country: string) => {
    dispatch({ type: 'SET_COUNTRY', payload: country });
  }, []);

  const setSelectedCategory = useCallback((category: string | null) => {
    dispatch({ type: 'SET_CATEGORY', payload: category });
  }, []);

  const setApiBaseUrl = useCallback((url: string) => {
    api.setApiBaseUrl(url);
    dispatch({ type: 'SET_API_URL', payload: url });
  }, []);

  const addFavorite = useCallback((addr: string) => {
    dispatch({ type: 'ADD_FAVORITE', payload: addr });
  }, []);

  const removeFavorite = useCallback((addr: string) => {
    dispatch({ type: 'REMOVE_FAVORITE', payload: addr });
  }, []);

  const importFavorites = useCallback((addrs: string[]) => {
    dispatch({ type: 'SET_FAVORITES', payload: addrs });
  }, []);

  const reorderFavorites = useCallback((from: number, to: number) => {
    dispatch({ type: 'REORDER_FAVORITES', payload: { from, to } });
  }, []);

  const isFavorite = useCallback((addr: string) => {
    return state.favorites.includes(addr);
  }, [state.favorites]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const setPerPage = useCallback((perPage: number) => {
    dispatch({ type: 'SET_PER_PAGE', payload: perPage });
  }, []);

  const value: AppContextType = {
    ...state,
    fetchServers,
    fetchCategories,
    fetchStats,
    fetchMetadata,
    setSearchQuery,
    setSelectedRegion,
    setSelectedGameType,
    setSelectedContinent,
    setSelectedGeoRegion,
    setSelectedCountry,
    setSelectedCategory,
    setApiBaseUrl,
    addFavorite,
    removeFavorite,
    importFavorites,
    reorderFavorites,
    isFavorite,
    clearError,
    setViewMode,
    setPerPage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use app context
export function useAppStore(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
