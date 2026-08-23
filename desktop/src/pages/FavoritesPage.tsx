import { lazy, Suspense } from 'react';
import { FavoriteServerGrid } from '@/components/favorites/FavoriteServerGrid';
import { CloudLoginPanel } from '@/components/CloudLoginPanel';
import { LatencyFilter } from '@/components/LatencyFilter';
import { ViewModeSwitch } from '@/components/ViewModeSwitch';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useFavoritesPage } from '@/hooks/useFavoritesPage';
import {
  AddFavoriteModal,
  CountdownProgressBar,
  LogoutIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  StarFilledIcon,
} from '@/components/favorites/FavoritePageControls';
import { rgbaToCss } from '@/store/themeUtils';

const ServerDetailModal = lazy(() => import('@/components/ServerDetailModal').then(module => ({ default: module.ServerDetailModal })));

export function FavoritesPage() {
  const theme = useTheme();
  const { t } = useI18n();
  const page = useFavoritesPage();
  const primaryColor = rgbaToCss(theme.colorRegions.primary);
  const textColor = rgbaToCss(theme.colorRegions.text);

  if (!page.authStatus.logged_in) {
    return (
      <CloudLoginPanel
        icon={<StarFilledIcon />}
        title={t.cloudFavorites}
        description={t.cloudFavoritesDesc}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <StarFilledIcon />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: textColor }}>
                  {t.myFavorites}
                </h1>
                <p className="text-xs text-gray-500">
                  {page.authStatus.user?.username && `${t.welcome}, ${page.authStatus.user.username}`}
                  {page.filteredFavoriteRows.length > 0 && ` · ${page.filteredFavoriteRows.length} ${t.favorites}`}
                </p>
              </div>
            </div>
            <button
              onClick={page.handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-sm transition-colors"
              title={t.logout}
            >
              <LogoutIcon />
              <span>{t.logout}</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={page.searchQuery}
                onChange={e => page.setSearchQuery(e.target.value)}
                placeholder={t.searchFavorites}
                className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-transparent hover:bg-gray-200/80 dark:hover:bg-gray-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-500/20 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 outline-none"
              />
              {page.searchQuery && (
                <button
                  onClick={() => page.setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {page.refreshInterval > 0 && (
              <CountdownProgressBar
                secondsRemaining={page.countdown}
                totalSeconds={page.refreshInterval}
                isLoading={page.isLoading && page.isManualRefresh}
              />
            )}
            <ViewModeSwitch viewMode={page.viewMode} onViewModeChange={page.handleViewModeChange} />
            <LatencyFilter
              value={page.latencyFilter}
              onChange={page.setLatencyFilter}
              label={t.latencyLimit}
              allLabel={t.latencyFilterAll}
              unknownLabel={t.latencyFilterUnknown}
            />
            <button
              onClick={() => page.setShowAddModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
              title={t.addFavoriteTitle}
            >
              <PlusIcon />
            </button>
            <button
              onClick={page.handleRefresh}
              disabled={page.isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
              title={t.refresh}
            >
              <RefreshIcon spinning={page.isLoading && page.isManualRefresh} />
            </button>
          </div>
        </div>
      </div>

      <FavoriteServerGrid
        t={t}
        textColor={textColor}
        error={page.error}
        setError={page.setError}
        isLoading={page.isLoading}
        isManualRefresh={page.isManualRefresh}
        favorites={page.favorites}
        setShowAddModal={page.setShowAddModal}
        paginatedFavoriteRows={page.paginatedFavoriteRows}
        filteredFavoriteRows={page.filteredFavoriteRows}
        searchQuery={page.searchQuery}
        totalFavorites={page.totalFavorites}
        itemsPerPage={page.itemsPerPage}
        handlePageSizeChange={page.handlePageSizeChange}
        totalPages={page.totalPages}
        currentPage={page.currentPage}
        setCurrentPage={page.setCurrentPage}
        viewMode={page.viewMode}
        handleSelectServer={page.handleSelectServer}
        handleFavoriteChange={page.handleFavoriteChange}
        handleReorder={page.handleReorder}
        setSearchQuery={page.setSearchQuery}
        setLatencyFilter={page.setLatencyFilter}
      />

      {page.selectedServer && (
        <Suspense fallback={null}>
          <ServerDetailModal
            server={page.selectedServer}
            onClose={() => page.setSelectedServer(null)}
            isCloudFavorite={true}
            onFavoriteRemoved={() => { page.setSelectedServer(null); page.loadFavorites(); }}
          />
        </Suspense>
      )}

      {page.showAddModal && (
        <AddFavoriteModal
          onClose={() => page.setShowAddModal(false)}
          onAdded={() => { page.loadFavorites(); page.bumpRefreshSignal(); }}
        />
      )}
    </div>
  );
}
