import { useContext } from 'react';
import { FavoritesContext } from '@/store/appContext';

export function useFavoritesStore() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavoritesStore must be used within AppProvider');
  return context;
}
