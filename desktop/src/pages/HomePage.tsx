import { lazy, Suspense, useCallback, useMemo, useState, type CSSProperties } from 'react';
import { HomeServerGrid } from '@/components/home/HomeServerGrid';
import { HomeToolbar } from '@/components/home/HomeToolbar';
import {
  useAppActions,
  useAppPreferencesStore,
  useServerDataStore,
  useServerFiltersStore,
} from '@/hooks/useAppSlices';
import { useFavoritesStore } from '@/hooks/useFavoritesStore';
import { useHomeFavoriteServers } from '@/hooks/useHomeFavoriteServers';
import { useHomeRefresh } from '@/hooks/useHomeRefresh';
import { useI18n } from '@/hooks/useI18n';
import { showToast } from '@/services/toast';
import type { ServerStatus } from '@/types';

const ServerDetailModal = lazy(() => import('@/components/ServerDetailModal').then(module => ({ default: module.ServerDetailModal })));
const AddServerModal = lazy(() => import('@/components/AddServerModal').then(module => ({ default: module.AddServerModal })));
const AddLocalServerModal = lazy(() => import('@/components/home/AddLocalServerModal').then(module => ({ default: module.AddLocalServerModal })));

export function HomePage() {
  const { servers, isLoading, error, currentPage } = useServerDataStore();
  const {
    searchQuery,
    selectedRegion,
    selectedGameType,
    selectedCategory,
    selectedContinent,
    selectedGeoRegion,
    selectedCountry,
  } = useServerFiltersStore();
  const { viewMode, cardMinWidth, perPage } = useAppPreferencesStore();
  const {
    fetchServers, fetchStats, fetchMetadata, clearError, setViewMode, setCardMinWidth,
  } = useAppActions();
  const {
    favorites,
    addFavorite,
    isFavorite,
    reorderFavorites,
    importFavorites,
    removeFavorite,
  } = useFavoritesStore();
  const { t } = useI18n();
  const cardGridStyle = useMemo(() => ({
    '--server-card-min-width': `${cardMinWidth}px`,
  }) as CSSProperties, [cardMinWidth]);

  const [selectedServer, setSelectedServer] = useState<ServerStatus | null>(null);
  const handleSelectServer = useCallback((server: ServerStatus) => setSelectedServer(server), []);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showAddLocalServerModal, setShowAddLocalServerModal] = useState(false);

  const fav = useHomeFavoriteServers({
    favorites,
    servers,
    perPage,
    reorderFavorites,
    importFavorites,
    removeFavorite,
  });
  const refresh = useHomeRefresh({
    fetchServers,
    fetchStats,
    fetchMetadata,
    currentPage,
    searchQuery,
    selectedRegion,
    selectedGameType,
    selectedCategory,
    selectedContinent,
    selectedGeoRegion,
    selectedCountry,
    perPage,
    isLoading,
    favLoading: fav.favLoading,
    showFavoritesOnly: fav.showFavoritesOnly,
    fetchFavServers: fav.fetchFavServers,
  });

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-gray-50 dark:bg-gray-900">
      <HomeToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        cardMinWidth={cardMinWidth}
        setCardMinWidth={setCardMinWidth}
        showFavoritesOnly={fav.showFavoritesOnly}
        setShowFavoritesOnly={fav.setShowFavoritesOnly}
        favSearchQuery={fav.favSearchQuery}
        setFavSearchQuery={fav.setFavSearchQuery}
        favoriteCount={favorites.length}
        latencyFilter={fav.latencyFilter}
        setLatencyFilter={fav.setLatencyFilter}
        t={t}
        showOfflineServers={fav.showOfflineServers}
        setShowOfflineServers={fav.setShowOfflineServers}
        favServers={fav.favServers}
        handleClearOffline={fav.handleClearOffline}
        onAddLocalServer={() => setShowAddLocalServerModal(true)}
        handleExportFavorites={fav.handleExportFavorites}
        handleImportFavorites={fav.handleImportFavorites}
        refreshInterval={refresh.refreshInterval}
        countdownResetToken={refresh.countdownResetToken}
        isLoading={isLoading}
        isManualRefresh={refresh.isManualRefresh}
        handleAutoRefresh={refresh.handleAutoRefresh}
        onAddServer={() => setShowAddServerModal(true)}
        handleRefresh={refresh.handleRefresh}
        favGameNames={fav.favGameNames}
        showAllGameTags={fav.showAllGameTags}
        setShowAllGameTags={fav.setShowAllGameTags}
        favGameFilter={fav.favGameFilter}
        setFavGameFilter={fav.setFavGameFilter}
      />
      <HomeServerGrid
        error={error}
        clearError={clearError}
        isLoading={isLoading}
        servers={servers}
        showFavoritesOnly={fav.showFavoritesOnly}
        favLoading={fav.favLoading}
        favServers={fav.favServers}
        viewMode={viewMode}
        cardGridStyle={cardGridStyle}
        t={t}
        filteredFavServers={fav.filteredFavServers}
        setShowFavoritesOnly={fav.setShowFavoritesOnly}
        latencyFilter={fav.latencyFilter}
        displayedServers={fav.displayedServers}
        displayedServersWithLatency={fav.displayedServersWithLatency}
        setLatencyFilter={fav.setLatencyFilter}
        isManualRefresh={refresh.isManualRefresh}
        favPage={fav.favPage}
        favTotalPages={fav.favTotalPages}
        latencyFilteredFavServers={fav.latencyFilteredFavServers}
        setFavPage={fav.setFavPage}
        handleSelectServer={handleSelectServer}
        handleLocalReorder={fav.handleLocalReorder}
        favoriteCount={favorites.length}
        perPage={perPage}
      />
      {selectedServer && (
        <Suspense fallback={null}>
          <ServerDetailModal
            server={selectedServer}
            onClose={() => setSelectedServer(null)}
          />
        </Suspense>
      )}
      {showAddServerModal && (
        <Suspense fallback={null}>
          <AddServerModal onClose={() => setShowAddServerModal(false)} />
        </Suspense>
      )}
      {showAddLocalServerModal && (
        <Suspense fallback={null}>
          <AddLocalServerModal
            onClose={() => setShowAddLocalServerModal(false)}
            onAdded={(addr) => {
              if (isFavorite(addr)) {
                showToast(t.addLocalServerDuplicate, '', 'info', 3000);
              } else {
                addFavorite(addr);
                showToast(t.addLocalServerSuccess, '', 'info', 3000);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
