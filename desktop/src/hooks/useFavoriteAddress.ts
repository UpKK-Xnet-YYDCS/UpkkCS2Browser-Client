import { useCallback, useContext, useSyncExternalStore } from 'react';
import { FavoriteAddressContext } from '@/store/appContext';

function useFavoriteAddressContext() {
  const context = useContext(FavoriteAddressContext);
  if (!context) throw new Error('favorite address hooks must be used within AppProvider');
  return context;
}

export function useIsFavorite(address: string): boolean {
  const context = useFavoriteAddressContext();
  const getSnapshot = useCallback(() => context.isFavorite(address), [address, context]);
  const subscribe = useCallback(
    (listener: () => void) => context.subscribe(address, listener),
    [address, context],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useFavoriteActions() {
  const { addFavorite, removeFavorite } = useFavoriteAddressContext();
  return { addFavorite, removeFavorite };
}
