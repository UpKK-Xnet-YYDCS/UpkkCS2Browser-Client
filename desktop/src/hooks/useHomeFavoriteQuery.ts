import { useCallback, useEffect, useRef, useState } from 'react';
import type { LocalLatencySchedulerOptions } from '@/hooks/useLocalLatencyQueue';
import { favoriteAddressSetChanged } from '@/services/favoritePagination';
import type { ServerStatus } from '@/types';

interface UseHomeFavoriteQueryOptions {
  favorites: string[];
  latencySchedulerOptions: LocalLatencySchedulerOptions;
}

export function useHomeFavoriteQuery({
  favorites,
  latencySchedulerOptions,
}: UseHomeFavoriteQueryOptions) {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favServers, setFavServers] = useState<ServerStatus[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  const fetchFavServers = useCallback(async () => {
    const { loadHomeFavoriteServers } = await import('@/services/homeFavoriteQuery');
    await loadHomeFavoriteServers(favorites, latencySchedulerOptions, setFavServers, setFavLoading);
  }, [favorites, latencySchedulerOptions]);

  // Re-fetch when favorites list content changes while in favorites-only mode
  // (e.g., after adding/removing a server via AddLocalServerModal)
  // Does NOT trigger on reorder (same set of addresses, different order)
  const prevFavoritesSetRef = useRef(new Set(favorites));
  useEffect(() => {
    if (!showFavoritesOnly) {
      prevFavoritesSetRef.current = new Set(favorites);
      return;
    }
    const currentSet = new Set(favorites);
    const prevSet = prevFavoritesSetRef.current;
    const changed = favoriteAddressSetChanged(prevSet, currentSet);
    if (changed) {
      fetchFavServers();
    }
    prevFavoritesSetRef.current = currentSet;
  }, [favorites, showFavoritesOnly, fetchFavServers]);

  return {
    showFavoritesOnly,
    setShowFavoritesOnly,
    favServers,
    setFavServers,
    favLoading,
    fetchFavServers,
  };
}
