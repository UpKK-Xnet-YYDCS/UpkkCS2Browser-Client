import { useReducer, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  AppActionsContext,
  AppPreferencesContext,
  FavoriteAddressContext,
  FavoritesContext,
  ServerDataContext,
  ServerFiltersContext,
  type AppActionsStore,
  type AppPreferencesStore,
  type ServerDataStore,
  type ServerFiltersStore,
} from './appContext';
import { appReducer, initialState } from './appState';
import { useAppDispatchActions } from './useAppDispatchActions';
import { useAppQueries } from './useAppQueries';
import { useDebouncedAppPersist } from './useDebouncedAppPersist';
import { useFavoriteAddressBridge } from './useFavoriteAddressBridge';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  // When a response comes back, only apply it if the version matches
  const requestVersionRef = useRef(0);

  useDebouncedAppPersist({
    favorites: state.favorites,
    apiBaseUrl: state.apiBaseUrl,
    selectedRegion: state.selectedRegion,
    selectedGameType: state.selectedGameType,
    selectedContinent: state.selectedContinent,
    selectedGeoRegion: state.selectedGeoRegion,
    selectedCountry: state.selectedCountry,
    viewMode: state.viewMode,
    perPage: state.perPage,
    cardMinWidth: state.cardMinWidth,
  });

  const { fetchServers, fetchCategories, fetchStats, fetchMetadata } = useAppQueries(
    dispatch,
    stateRef,
    requestVersionRef,
  );

  const {
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
    clearError,
    setViewMode,
    setPerPage,
    setCardMinWidth,
  } = useAppDispatchActions(dispatch);
  const { isFavorite, subscribeFavorite, isFavoriteSnapshot } = useFavoriteAddressBridge(state.favorites);

  const actionsValue = useMemo<AppActionsStore>(() => ({
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
    clearError,
    setViewMode,
    setPerPage,
    setCardMinWidth,
  }), [
    clearError, fetchCategories, fetchMetadata, fetchServers, fetchStats, setApiBaseUrl,
    setCardMinWidth, setPerPage, setSearchQuery, setSelectedCategory, setSelectedContinent,
    setSelectedCountry, setSelectedGameType, setSelectedGeoRegion, setSelectedRegion, setViewMode,
  ]);
  const serverDataValue = useMemo<ServerDataStore>(() => ({
    servers: state.servers,
    totalServers: state.totalServers,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    isLoading: state.isLoading,
    error: state.error,
    categories: state.categories,
    stats: state.stats,
    metadataCountries: state.metadataCountries,
    metadataMaps: state.metadataMaps,
  }), [
    state.categories, state.currentPage, state.error, state.isLoading, state.metadataCountries,
    state.metadataMaps, state.servers, state.stats, state.totalPages, state.totalServers,
  ]);
  const filtersValue = useMemo<ServerFiltersStore>(() => ({
    searchQuery: state.searchQuery,
    selectedCategory: state.selectedCategory,
    selectedRegion: state.selectedRegion,
    selectedGameType: state.selectedGameType,
    selectedContinent: state.selectedContinent,
    selectedGeoRegion: state.selectedGeoRegion,
    selectedCountry: state.selectedCountry,
  }), [
    state.searchQuery, state.selectedCategory, state.selectedContinent, state.selectedCountry,
    state.selectedGameType, state.selectedGeoRegion, state.selectedRegion,
  ]);
  const preferencesValue = useMemo<AppPreferencesStore>(() => ({
    apiBaseUrl: state.apiBaseUrl,
    viewMode: state.viewMode,
    perPage: state.perPage,
    cardMinWidth: state.cardMinWidth,
  }), [state.apiBaseUrl, state.cardMinWidth, state.perPage, state.viewMode]);

  const favoritesValue = useMemo(() => ({
    favorites: state.favorites,
    addFavorite,
    removeFavorite,
    importFavorites,
    reorderFavorites,
    isFavorite,
  }), [addFavorite, importFavorites, isFavorite, removeFavorite, reorderFavorites, state.favorites]);
  const favoriteAddressValue = useMemo(() => ({
    subscribe: subscribeFavorite,
    isFavorite: isFavoriteSnapshot,
    addFavorite,
    removeFavorite,
  }), [addFavorite, isFavoriteSnapshot, removeFavorite, subscribeFavorite]);

  return (
    <AppActionsContext.Provider value={actionsValue}>
      <ServerDataContext.Provider value={serverDataValue}>
        <ServerFiltersContext.Provider value={filtersValue}>
          <AppPreferencesContext.Provider value={preferencesValue}>
            <FavoritesContext.Provider value={favoritesValue}>
              <FavoriteAddressContext.Provider value={favoriteAddressValue}>
                {children}
              </FavoriteAddressContext.Provider>
            </FavoritesContext.Provider>
          </AppPreferencesContext.Provider>
        </ServerFiltersContext.Provider>
      </ServerDataContext.Provider>
    </AppActionsContext.Provider>
  );
}
