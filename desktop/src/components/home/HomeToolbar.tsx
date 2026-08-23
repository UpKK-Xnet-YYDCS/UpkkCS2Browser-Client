import { CategoryFilter } from '@/components/CategoryFilter';
import { ContinentFilter } from '@/components/ContinentFilter';
import { FavoriteFilter } from '@/components/FavoriteFilter';
import { GameTypeFilter } from '@/components/GameTypeFilter';
import { LatencyFilter } from '@/components/LatencyFilter';
import { RegionFilter } from '@/components/RegionFilter';
import { SearchBar } from '@/components/SearchBar';
import { StatsBar } from '@/components/StatsBar';
import { ViewModeSwitch } from '@/components/ViewModeSwitch';
import type { LatencyFilterValue, ViewMode } from '@/types/ui';
import {
  AutoRefreshCountdown,
  CardSizeControl,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
} from '@/components/home/HomeControls';
import { HomeFavoriteActions } from '@/components/home/HomeFavoriteActions';
import { HomeFavoriteGameTags } from '@/components/home/HomeFavoriteGameTags';
import type { Translations } from '@/store/i18n';
import type { ServerStatus } from '@/types';

export interface HomeToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  cardMinWidth: number;
  setCardMinWidth: (width: number) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (value: boolean) => void;
  favSearchQuery: string;
  setFavSearchQuery: (value: string) => void;
  favoriteCount: number;
  latencyFilter: LatencyFilterValue;
  setLatencyFilter: (value: LatencyFilterValue) => void;
  t: Translations;
  showOfflineServers: boolean;
  setShowOfflineServers: (value: boolean | ((prev: boolean) => boolean)) => void;
  favServers: ServerStatus[];
  handleClearOffline: () => void;
  onAddLocalServer: () => void;
  handleExportFavorites: () => void;
  handleImportFavorites: () => void;
  refreshInterval: number;
  countdownResetToken: number;
  isLoading: boolean;
  isManualRefresh: boolean;
  handleAutoRefresh: () => void;
  onAddServer: () => void;
  handleRefresh: () => void;
  favGameNames: Array<{ name: string; count: number }>;
  showAllGameTags: boolean;
  setShowAllGameTags: (value: boolean | ((prev: boolean) => boolean)) => void;
  favGameFilter: string;
  setFavGameFilter: (value: string) => void;
}

export function HomeToolbar({
  viewMode,
  setViewMode,
  cardMinWidth,
  setCardMinWidth,
  showFavoritesOnly,
  setShowFavoritesOnly,
  favSearchQuery,
  setFavSearchQuery,
  favoriteCount,
  latencyFilter,
  setLatencyFilter,
  t,
  showOfflineServers,
  setShowOfflineServers,
  favServers,
  handleClearOffline,
  onAddLocalServer,
  handleExportFavorites,
  handleImportFavorites,
  refreshInterval,
  countdownResetToken,
  isLoading,
  isManualRefresh,
  handleAutoRefresh,
  onAddServer,
  handleRefresh,
  favGameNames,
  showAllGameTags,
  setShowAllGameTags,
  favGameFilter,
  setFavGameFilter,
}: HomeToolbarProps) {
  return (
    <>
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 py-3 space-y-3 sm:px-4">
          {/* Row 1: Game Type, Region, ViewMode, Stats */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <GameTypeFilter />
              <RegionFilter />
              <ViewModeSwitch viewMode={viewMode} onViewModeChange={setViewMode} />
              {viewMode === 'card' && (
                <CardSizeControl value={cardMinWidth} onChange={setCardMinWidth} />
              )}
            </div>
            <StatsBar />
          </div>
          {/* Row 2: Search bar + Continent/Country + Favorites + Refresh controls */}
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-full min-w-0 sm:flex-1 sm:min-w-56">
              {showFavoritesOnly ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    value={favSearchQuery}
                    onChange={e => setFavSearchQuery(e.target.value)}
                    placeholder={t.searchLocalFavorites}
                    className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-transparent hover:bg-gray-200/80 dark:hover:bg-gray-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-500/20 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 outline-none"
                  />
                  {favSearchQuery && (
                    <button
                      onClick={() => setFavSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <SearchBar />
              )}
            </div>
            {!showFavoritesOnly && <ContinentFilter />}
            <FavoriteFilter 
              showFavoritesOnly={showFavoritesOnly} 
              onToggle={setShowFavoritesOnly}
              favoriteCount={favoriteCount}
            />
            <LatencyFilter
              value={latencyFilter}
              onChange={setLatencyFilter}
              label={t.latencyLimit}
              allLabel={t.latencyFilterAll}
              unknownLabel={t.latencyFilterUnknown}
            />
            {showFavoritesOnly && (
              <HomeFavoriteActions
                t={t}
                showOfflineServers={showOfflineServers}
                setShowOfflineServers={setShowOfflineServers}
                favServers={favServers}
                handleClearOffline={handleClearOffline}
                onAddLocalServer={onAddLocalServer}
                handleExportFavorites={handleExportFavorites}
                handleImportFavorites={handleImportFavorites}
                favoriteCount={favoriteCount}
              />
            )}
            {refreshInterval > 0 && (
              <AutoRefreshCountdown
                key={`${refreshInterval}:${countdownResetToken}`}
                interval={refreshInterval}
                isLoading={isLoading && isManualRefresh}
                onRefresh={handleAutoRefresh}
              />
            )}
            <button
              onClick={() => onAddServer()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
              title={t.addServer}
            >
              <PlusIcon />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
              title={t.refreshServerList}
            >
              <RefreshIcon spinning={isLoading && isManualRefresh} />
            </button>
          </div>
          {/* Row 3: Category filter */}
          <CategoryFilter />
          {/* Row 4: Game filter tags for local favorites (only when >1 unique game) */}
          {showFavoritesOnly && (
            <HomeFavoriteGameTags
              t={t}
              favGameNames={favGameNames}
              favGameFilter={favGameFilter}
              setFavGameFilter={setFavGameFilter}
              showAllGameTags={showAllGameTags}
              setShowAllGameTags={setShowAllGameTags}
            />
          )}
        </div>
      </div>

    </>
  );
}
