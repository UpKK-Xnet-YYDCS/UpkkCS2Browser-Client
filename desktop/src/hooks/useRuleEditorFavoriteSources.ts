import { useCallback, useEffect, useState } from 'react';
import { getFavorites, type FavoriteServer } from '@/api/favorites';
import { parseServerAddress, queryServerA2S } from '@/services/a2s';

export function useRuleEditorFavoriteSources(isLoggedIn: boolean, localFavorites: string[]) {
  const [favoriteServers, setFavoriteServers] = useState<FavoriteServer[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [localServerNames, setLocalServerNames] = useState<Record<string, string>>({});

  const loadFavorites = useCallback(() => {
    if (!isLoggedIn || favoritesLoaded || loadingFavorites) return;
    setLoadingFavorites(true);
    getFavorites(1, 100)
      .then(res => {
        setFavoriteServers(res.favorites || []);
        setFavoritesLoaded(true);
      })
      .catch(() => { setFavoritesLoaded(true); })
      .finally(() => setLoadingFavorites(false));
  }, [favoritesLoaded, isLoggedIn, loadingFavorites]);

  useEffect(() => {
    if (isLoggedIn && !favoritesLoaded) {
      const timer = window.setTimeout(() => loadFavorites(), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [favoritesLoaded, isLoggedIn, loadFavorites]);

  useEffect(() => {
    if (!favoritesLoaded) return;
    const cloudKeys = new Set(favoriteServers.map(s => `${s.server_ip}:${s.server_port}`));
    const localOnly = localFavorites.filter(addr => !cloudKeys.has(addr));
    if (localOnly.length === 0) return;

    let cancelled = false;
    const resolveNames = async () => {
      const resolved: Record<string, string> = {};
      for (const addr of localOnly) {
        if (cancelled) break;
        const parsed = parseServerAddress(addr);
        if (!parsed) continue;
        try {
          const result = await queryServerA2S(parsed.ip, parsed.port);
          if (result.success && result.name) {
            resolved[addr] = result.name;
          }
        } catch { /* keep the address when A2S name resolution fails */ }
      }
      if (!cancelled) {
        setLocalServerNames(prev => ({ ...prev, ...resolved }));
      }
    };
    resolveNames();
    return () => { cancelled = true; };
  }, [favoritesLoaded, favoriteServers, localFavorites]);

  return {
    favoriteServers,
    loadingFavorites,
    localServerNames,
  };
}
