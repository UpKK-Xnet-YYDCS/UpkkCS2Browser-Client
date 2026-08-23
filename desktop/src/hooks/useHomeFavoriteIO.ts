import { useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  offlineFavoriteAddresses,
  parseImportedFavoriteAddresses,
} from '@/services/homeFavoriteFilters';
import type { Translations } from '@/store/i18n';
import type { ServerStatus } from '@/types';
import { isServerOnline } from '@/utils/serverStatus';

interface UseHomeFavoriteIOOptions {
  favorites: string[];
  favServers: ServerStatus[];
  showFavoritesOnly: boolean;
  t: Translations;
  importFavorites: (addresses: string[]) => void;
  removeFavorite: (address: string) => void;
  fetchFavServers: () => void;
  setFavServers: Dispatch<SetStateAction<ServerStatus[]>>;
}

export function useHomeFavoriteIO({
  favorites,
  favServers,
  showFavoritesOnly,
  t,
  importFavorites,
  removeFavorite,
  fetchFavServers,
  setFavServers,
}: UseHomeFavoriteIOOptions) {
  const handleExportFavorites = useCallback(async () => {
    const { exportHomeFavorites } = await import('@/services/homeFavoriteQuery');
    await exportHomeFavorites(favorites, {
      title: t.exportFavorites,
      success: t.exportFavoritesSuccess,
    });
  }, [favorites, t.exportFavorites, t.exportFavoritesSuccess]);

  const handleClearOffline = useCallback(() => {
    const offlineAddrs = offlineFavoriteAddresses(favServers);
    if (offlineAddrs.length === 0) return;
    for (const addr of offlineAddrs) {
      removeFavorite(addr);
    }
    setFavServers(prev => prev.filter(s => isServerOnline(s)));
  }, [favServers, removeFavorite, setFavServers]);

  const handleImportFavorites = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const valid = parseImportedFavoriteAddresses(text);
        if (valid.length > 0) {
          importFavorites(valid);
          if (showFavoritesOnly) fetchFavServers();
        }
      } catch {
        console.error('[HomePage] Failed to import favorites');
      }
    };
    input.click();
  }, [fetchFavServers, importFavorites, showFavoritesOnly]);

  return {
    handleExportFavorites,
    handleImportFavorites,
    handleClearOffline,
  };
}
