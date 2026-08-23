import { ServerCard } from '@/components/ServerCard';
import { ServerListItem } from '@/components/ServerListItem';
import {
  ServerGridEmptyState,
  ServerGridErrorBanner,
  ServerGridLoadingOverlay,
  ServerGridShell,
} from '@/components/serverGrid/ServerGridChrome';
import { ReorderableServerTile } from '@/components/serverGrid/ReorderableServerTile';
import { FavoritePageToolbar, FavoritePagination } from '@/components/favorites/FavoritePagination';
import {
  type FavoriteRow,
} from '@/hooks/useFavoritesPage';
import type { Translations } from '@/store/i18n';
import type { LatencyFilterValue, ViewMode } from '@/types/ui';
import type { FavoriteServer } from '@/api/favorites';
import type { ServerStatus } from '@/types';

export interface FavoriteServerGridProps {
  t: Translations;
  textColor: string;
  error: string | null;
  setError: (error: string | null) => void;
  isLoading: boolean;
  isManualRefresh: boolean;
  favorites: FavoriteServer[];
  setShowAddModal: (open: boolean) => void;
  paginatedFavoriteRows: FavoriteRow[];
  filteredFavoriteRows: FavoriteRow[];
  searchQuery: string;
  totalFavorites: number;
  itemsPerPage: number;
  handlePageSizeChange: (size: number) => void;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  viewMode: ViewMode;
  handleSelectServer: (server: ServerStatus) => void;
  handleFavoriteChange: () => void;
  handleReorder: (sourceIndex: number, direction: 'up' | 'down') => void;
  setSearchQuery: (query: string) => void;
  setLatencyFilter: (value: LatencyFilterValue) => void;
}

export function FavoriteServerGrid({
  t,
  textColor,
  error,
  setError,
  isLoading,
  isManualRefresh,
  favorites,
  setShowAddModal,
  paginatedFavoriteRows,
  filteredFavoriteRows,
  searchQuery,
  totalFavorites,
  itemsPerPage,
  handlePageSizeChange,
  totalPages,
  currentPage,
  setCurrentPage,
  viewMode,
  handleSelectServer,
  handleFavoriteChange,
  handleReorder,
  setSearchQuery,
  setLatencyFilter,
}: FavoriteServerGridProps) {
  return (
    <ServerGridShell>
      {error && (
        <ServerGridErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {isLoading && favorites.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200 dark:bg-gray-700" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && favorites.length === 0 && (
        <ServerGridEmptyState>
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2" style={{ color: textColor }}>
            {t.noFavorites}
          </h3>
          <p className="text-gray-500 mb-4">
            {t.noFavoritesHint}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium transition-colors hover:from-green-600 hover:to-emerald-600"
          >
            {t.addFavoriteTitle}
          </button>
        </ServerGridEmptyState>
      )}

      {paginatedFavoriteRows.length > 0 && (
        <div className="relative">
          {isLoading && isManualRefresh && (
            <ServerGridLoadingOverlay label={t.loadingFavorites} />
          )}

          <FavoritePageToolbar
            t={t}
            filteredCount={filteredFavoriteRows.length}
            searchQuery={searchQuery}
            totalFavorites={totalFavorites}
            itemsPerPage={itemsPerPage}
            handlePageSizeChange={handlePageSizeChange}
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />

          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedFavoriteRows.map(({ fav, server, sourceIndex }) => (
                <ReorderableServerTile
                  key={fav.server_ip + ':' + fav.server_port}
                  variant="card"
                  onReorder={(direction) => handleReorder(sourceIndex, direction)}
                  canMoveUp={sourceIndex !== 0}
                  canMoveDown={sourceIndex < favorites.length - 1}
                  moveUpTitle={t.moveUp}
                  moveDownTitle={t.moveDown}
                >
                  <ServerCard
                    server={server}
                    onSelect={handleSelectServer}
                    onFavoriteChange={handleFavoriteChange}
                    hideCloudFavorite
                  />
                </ReorderableServerTile>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedFavoriteRows.map(({ fav, server, sourceIndex }) => (
                <ReorderableServerTile
                  key={fav.server_ip + ':' + fav.server_port}
                  variant="list"
                  onReorder={(direction) => handleReorder(sourceIndex, direction)}
                  canMoveUp={sourceIndex !== 0}
                  canMoveDown={sourceIndex < favorites.length - 1}
                  moveUpTitle={t.moveUp}
                  moveDownTitle={t.moveDown}
                >
                  <ServerListItem
                    server={server}
                    onSelect={handleSelectServer}
                  />
                </ReorderableServerTile>
              ))}
            </div>
          )}

          <FavoritePagination
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </div>
      )}

      {!isLoading && filteredFavoriteRows.length === 0 && favorites.length > 0 && (
        <ServerGridEmptyState>
          <p className="text-gray-500">{t.noServersFound}</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setLatencyFilter('all');
            }}
            className="mt-2 text-sm text-blue-500 hover:text-blue-600"
          >
            {t.showAllServers}
          </button>
        </ServerGridEmptyState>
      )}
    </ServerGridShell>
  );
}
