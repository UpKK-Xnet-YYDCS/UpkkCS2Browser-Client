import type { ComponentType } from 'react';
import { ServerCard } from '@/components/ServerCard';
import { ReorderableServerTile } from '@/components/serverGrid/ReorderableServerTile';
import { ServerListItem } from '@/components/ServerListItem';
import type { ViewMode } from '@/types/ui';
import { homeFavoriteGlobalIndex } from '@/services/homeServerGridState';
import type { Translations } from '@/store/i18n';
import type { ServerStatus } from '@/types';

export function HomeServerTile({
  server,
  index,
  viewMode,
  showFavoritesOnly,
  favPage,
  perPage,
  favoriteCount,
  t,
  onSelect,
  onReorder,
}: {
  server: ServerStatus;
  index: number;
  viewMode: ViewMode;
  showFavoritesOnly: boolean;
  favPage: number;
  perPage: number;
  favoriteCount: number;
  t: Translations;
  onSelect: (server: ServerStatus) => void;
  onReorder: (index: number, direction: 'up' | 'down') => void;
}) {
  const item = viewMode === 'card'
    ? <ServerCard server={server} onSelect={onSelect} />
    : <ServerListItem server={server} onSelect={onSelect} />;
  if (!showFavoritesOnly) return item;

  const globalIndex = homeFavoriteGlobalIndex(favPage, perPage, index);
  return (
    <ReorderableServerTile
      variant={viewMode === 'card' ? 'card' : 'list'}
      onReorder={(direction) => onReorder(index, direction)}
      canMoveUp={globalIndex !== 0}
      canMoveDown={globalIndex < favoriteCount - 1}
      moveUpTitle={t.moveUp}
      moveDownTitle={t.moveDown}
    >
      {item}
    </ReorderableServerTile>
  );
}

export function HomeGridPagination({
  Component,
  showFavoritesOnly,
  favPage,
  favTotalPages,
  filteredCount,
  onPageChange,
}: {
  Component: ComponentType<{
    overrideCurrentPage?: number;
    overrideTotalPages?: number;
    overrideTotalServers?: number;
    onPageChange?: (page: number) => void;
  }>;
  showFavoritesOnly: boolean;
  favPage: number;
  favTotalPages: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
}) {
  return showFavoritesOnly ? (
    <Component
      overrideCurrentPage={favPage}
      overrideTotalPages={favTotalPages}
      overrideTotalServers={filteredCount}
      onPageChange={onPageChange}
    />
  ) : (
    <Component />
  );
}
