import type { CSSProperties, ReactNode } from 'react';
import { ServerCardSkeleton, ServerListItemSkeleton } from '@/components/ServerCardSkeleton';
import { ServerGridEmptyState } from '@/components/serverGrid/ServerGridChrome';
import type { ViewMode } from '@/types/ui';
import type { Translations } from '@/store/i18n';

const SERVER_PATH = 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01';
const STAR_PATH = 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363 1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';
const CLOCK_PATH = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';

function HomeGridEmptyIcon({
  gradientClass,
  iconClass,
  path,
}: {
  gradientClass: string;
  iconClass: string;
  path: string;
}) {
  return (
    <div className={'w-20 h-20 mx-auto mb-4 bg-gradient-to-br ' + gradientClass + ' rounded-2xl flex items-center justify-center'}>
      <svg className={'w-10 h-10 ' + iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
      </svg>
    </div>
  );
}

function HomeGridEmptyAction({
  className,
  onClick,
  children,
}: {
  className: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}

const PRIMARY_ACTION = 'mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors';
const LATENCY_ACTION = 'mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors';
const GRAY_GRADIENT = 'from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800';

export function HomeGridSkeleton({
  viewMode,
  cardGridStyle,
}: {
  viewMode: ViewMode;
  cardGridStyle: CSSProperties;
}) {
  return (
    <div>
      <div className="mb-4 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      {viewMode === 'card' ? (
        <div className="server-card-grid" style={cardGridStyle}>
          {Array.from({ length: 6 }).map((_, index) => (
            <ServerCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <ServerListItemSkeleton key={index} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeNoServersState({ t }: { t: Translations }) {
  return (
    <ServerGridEmptyState>
      <HomeGridEmptyIcon gradientClass={GRAY_GRADIENT} iconClass="text-gray-400" path={SERVER_PATH} />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.noServersFound}</h3>
      <p className="text-gray-500 dark:text-gray-400">{t.noServersHint}</p>
    </ServerGridEmptyState>
  );
}

export function HomeNoFavoritesState({
  t,
  onShowAll,
}: {
  t: Translations;
  onShowAll: () => void;
}) {
  return (
    <ServerGridEmptyState>
      <HomeGridEmptyIcon
        gradientClass="from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30"
        iconClass="text-yellow-500"
        path={STAR_PATH}
      />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.noFavoriteServers}</h3>
      <p className="text-gray-500 dark:text-gray-400">{t.noFavoriteServersHint}</p>
      <HomeGridEmptyAction className={PRIMARY_ACTION} onClick={onShowAll}>
        {t.showAllServers}
      </HomeGridEmptyAction>
    </ServerGridEmptyState>
  );
}

export function HomeLatencyEmptyState({
  t,
  onClearFilter,
}: {
  t: Translations;
  onClearFilter: () => void;
}) {
  return (
    <ServerGridEmptyState>
      <HomeGridEmptyIcon gradientClass={GRAY_GRADIENT} iconClass="text-gray-400" path={CLOCK_PATH} />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.noServersFound}</h3>
      <HomeGridEmptyAction className={LATENCY_ACTION} onClick={onClearFilter}>
        {t.showAllServers}
      </HomeGridEmptyAction>
    </ServerGridEmptyState>
  );
}
