import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { FavoriteAddressSubscriptions } from '@/services/favoriteAddresses';

export function useFavoriteAddressBridge(favorites: string[]) {
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const isFavorite = useCallback((addr: string) => favoriteSet.has(addr), [favoriteSet]);
  const favoriteSetRef = useRef(favoriteSet);
  const favoriteSubscriptionsRef = useRef(new FavoriteAddressSubscriptions());
  useLayoutEffect(() => {
    const previous = favoriteSetRef.current;
    favoriteSetRef.current = favoriteSet;
    favoriteSubscriptionsRef.current.notifyChanges(previous, favoriteSet);
  }, [favoriteSet]);
  const subscribeFavorite = useCallback((address: string, listener: () => void) =>
    favoriteSubscriptionsRef.current.subscribe(address, listener), []);
  const isFavoriteSnapshot = useCallback((addr: string) => favoriteSetRef.current.has(addr), []);

  return {
    isFavorite,
    subscribeFavorite,
    isFavoriteSnapshot,
  };
}
