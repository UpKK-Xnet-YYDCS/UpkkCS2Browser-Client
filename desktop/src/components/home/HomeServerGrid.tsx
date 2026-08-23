import type { CSSProperties } from 'react';
import { Pagination } from '@/components/Pagination';
import {
  ServerGridErrorBanner,
  ServerGridLoadingOverlay,
  ServerGridShell,
} from '@/components/serverGrid/ServerGridChrome';
import { TopPagination } from '@/components/TopPagination';
import type { LatencyFilterValue, ViewMode } from '@/types/ui';
import {
  HomeGridSkeleton,
  HomeLatencyEmptyState,
  HomeNoFavoritesState,
  HomeNoServersState,
} from '@/components/home/HomeServerGridStates';
import { HomeGridPagination, HomeServerTile } from '@/components/home/HomeServerTile';
import { getServerEntityKey } from '@/services/serverEntities';
import {
  shouldShowHomeGridSkeleton,
  shouldShowHomeLatencyEmpty,
  shouldShowHomeNoFavorites,
  shouldShowHomeNoServers,
} from '@/services/homeServerGridState';
import type { Translations } from '@/store/i18n';
import type { ServerStatus } from '@/types';

export interface HomeServerGridProps {
  error: string | null;
  clearError: () => void;
  isLoading: boolean;
  servers: ServerStatus[];
  showFavoritesOnly: boolean;
  favLoading: boolean;
  favServers: ServerStatus[];
  viewMode: ViewMode;
  cardGridStyle: CSSProperties;
  t: Translations;
  filteredFavServers: ServerStatus[];
  setShowFavoritesOnly: (value: boolean) => void;
  latencyFilter: LatencyFilterValue;
  displayedServers: ServerStatus[];
  displayedServersWithLatency: ServerStatus[];
  setLatencyFilter: (value: LatencyFilterValue) => void;
  isManualRefresh: boolean;
  favPage: number;
  favTotalPages: number;
  latencyFilteredFavServers: ServerStatus[];
  setFavPage: (page: number) => void;
  handleSelectServer: (server: ServerStatus) => void;
  handleLocalReorder: (index: number, direction: 'up' | 'down') => void;
  favoriteCount: number;
  perPage: number;
}

export function HomeServerGrid({
  error,
  clearError,
  isLoading,
  servers,
  showFavoritesOnly,
  favLoading,
  favServers,
  viewMode,
  cardGridStyle,
  t,
  filteredFavServers,
  setShowFavoritesOnly,
  latencyFilter,
  displayedServers,
  displayedServersWithLatency,
  setLatencyFilter,
  isManualRefresh,
  favPage,
  favTotalPages,
  latencyFilteredFavServers,
  setFavPage,
  handleSelectServer,
  handleLocalReorder,
  favoriteCount,
  perPage,
}: HomeServerGridProps) {
  const pagination = {
    showFavoritesOnly,
    favPage,
    favTotalPages,
    filteredCount: latencyFilteredFavServers.length,
    onPageChange: setFavPage,
  };

  return (
    <ServerGridShell>
      {error && (
        <ServerGridErrorBanner
          message={error}
          onDismiss={clearError}
          showIcon
          dismissClassName="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1"
        />
      )}

      {shouldShowHomeGridSkeleton({
        isLoading,
        serversLength: servers.length,
        showFavoritesOnly,
        favLoading,
        favServersLength: favServers.length,
      }) && <HomeGridSkeleton viewMode={viewMode} cardGridStyle={cardGridStyle} />}

      {shouldShowHomeNoServers({ isLoading, serversLength: servers.length, error }) && (
        <HomeNoServersState t={t} />
      )}

      {shouldShowHomeNoFavorites({
        favLoading,
        showFavoritesOnly,
        filteredFavLength: filteredFavServers.length,
      }) && <HomeNoFavoritesState t={t} onShowAll={() => setShowFavoritesOnly(false)} />}

      {shouldShowHomeLatencyEmpty({
        isLoading,
        favLoading,
        latencyFilter,
        displayedLength: displayedServers.length,
        displayedWithLatencyLength: displayedServersWithLatency.length,
      }) && <HomeLatencyEmptyState t={t} onClearFilter={() => setLatencyFilter('all')} />}

      {displayedServersWithLatency.length > 0 && (
        <div className="relative">
          {isLoading && !showFavoritesOnly && isManualRefresh && (
            <ServerGridLoadingOverlay label={t.loadingServers} />
          )}

          <div className="mb-4">
            <HomeGridPagination Component={TopPagination} {...pagination} />
          </div>

          {viewMode === 'card' ? (
            <div className="server-card-grid" style={cardGridStyle}>
              {displayedServersWithLatency.map((server, index) => (
                <HomeServerTile
                  key={getServerEntityKey(server)}
                  server={server}
                  index={index}
                  viewMode={viewMode}
                  showFavoritesOnly={showFavoritesOnly}
                  favPage={favPage}
                  perPage={perPage}
                  favoriteCount={favoriteCount}
                  t={t}
                  onSelect={handleSelectServer}
                  onReorder={handleLocalReorder}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {displayedServersWithLatency.map((server, index) => (
                <HomeServerTile
                  key={getServerEntityKey(server)}
                  server={server}
                  index={index}
                  viewMode={viewMode}
                  showFavoritesOnly={showFavoritesOnly}
                  favPage={favPage}
                  perPage={perPage}
                  favoriteCount={favoriteCount}
                  t={t}
                  onSelect={handleSelectServer}
                  onReorder={handleLocalReorder}
                />
              ))}
            </div>
          )}

          <HomeGridPagination Component={Pagination} {...pagination} />
        </div>
      )}
    </ServerGridShell>
  );
}
