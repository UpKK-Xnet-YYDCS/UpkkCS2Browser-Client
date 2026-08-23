import { useState, type MouseEvent } from 'react';
import { addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from '@/api/favorites';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useFavoriteActions, useIsFavorite } from '@/hooks/useFavoriteAddress';

interface UseServerCloudFavoriteOptions {
  favoriteAddr: string;
  serverIp: string | number;
  serverPort: string | number;
  serverName: string;
  onFavoriteChange?: () => void;
}

export function useServerCloudFavorite({
  favoriteAddr,
  serverIp,
  serverPort,
  serverName,
  onFavoriteChange,
}: UseServerCloudFavoriteOptions) {
  const { addFavorite: addLocalFavorite, removeFavorite: removeLocalFavorite } = useFavoriteActions();
  const { isLoggedIn } = useCloudAuth();
  const [isCloudFavorite, setIsCloudFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [showCloudPrompt, setShowCloudPrompt] = useState<'add' | 'remove' | null>(null);
  const localFav = useIsFavorite(favoriteAddr);
  const favorite = localFav || isCloudFavorite;

  const handleFavoriteClick = async (event: MouseEvent) => {
    event.stopPropagation();
    const currentlyFavorite = favorite;

    if (currentlyFavorite) {
      removeLocalFavorite(favoriteAddr);
    } else {
      addLocalFavorite(favoriteAddr);
    }

    if (isLoggedIn) {
      setShowCloudPrompt(currentlyFavorite ? 'remove' : 'add');
    }
  };

  const handleCloudPromptConfirm = async () => {
    const action = showCloudPrompt;
    setShowCloudPrompt(null);
    setIsFavoriteLoading(true);
    try {
      if (action === 'add') {
        await apiAddFavorite(String(serverIp), String(serverPort), serverName);
        setIsCloudFavorite(true);
      } else {
        await apiRemoveFavorite(String(serverIp), String(serverPort));
        setIsCloudFavorite(false);
      }
      onFavoriteChange?.();
    } catch (error) {
      console.error('Failed to update cloud favorite:', error);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  return {
    isLoggedIn,
    favorite,
    isFavoriteLoading,
    showCloudPrompt,
    setShowCloudPrompt,
    handleFavoriteClick,
    handleCloudPromptConfirm,
  };
}
