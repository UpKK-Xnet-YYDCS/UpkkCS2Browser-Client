import { createContext } from 'react';
import type { AppContextType } from './index';

export const AppContext = createContext<AppContextType | null>(null);

export interface FavoritesContextType {
  favorites: string[];
  addFavorite: (address: string) => void;
  removeFavorite: (address: string) => void;
  importFavorites: (addresses: string[]) => void;
  reorderFavorites: (from: number, to: number) => void;
  isFavorite: (address: string) => boolean;
}

export const FavoritesContext = createContext<FavoritesContextType | null>(null);
