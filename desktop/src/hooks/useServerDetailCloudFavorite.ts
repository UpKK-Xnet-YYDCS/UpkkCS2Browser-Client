import { useState } from 'react';
import { addFavorite as apiAddFavorite, removeFavorite as apiRemoveFavorite } from '@/api/favorites';
import { cloudFavoriteClickAction } from '@/services/serverDetailQuery';

interface UseServerDetailCloudFavoriteOptions {
  serverIp: string;
  serverPort: string;
  serverName: string;
  isCloudFavorite?: boolean;
  onFavoriteRemoved?: () => void;
  onClose: () => void;
}

export function useServerDetailCloudFavorite({
  serverIp,
  serverPort,
  serverName,
  isCloudFavorite,
  onFavoriteRemoved,
  onClose,
}: UseServerDetailCloudFavoriteOptions) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cloudFavState, setCloudFavState] = useState<boolean | null>(isCloudFavorite ?? null);
  const [cloudFavLoading, setCloudFavLoading] = useState(false);

  const handleCloudFavoriteToggle = async () => {
    if (cloudFavoriteClickAction(cloudFavState) === 'confirm-remove') {
      setShowRemoveConfirm(true);
      return;
    }
    setCloudFavLoading(true);
    try {
      await apiAddFavorite(String(serverIp), String(serverPort), serverName);
      setCloudFavState(true);
      onFavoriteRemoved?.();
    } catch (err) {
      console.error('Failed to toggle cloud favorite:', err);
    } finally {
      setCloudFavLoading(false);
    }
  };

  const handleCloudRemove = async () => {
    setRemoving(true);
    try {
      await apiRemoveFavorite(serverIp, String(serverPort));
      setCloudFavState(false);
      setShowRemoveConfirm(false);
      if (isCloudFavorite) onClose();
      onFavoriteRemoved?.();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    } finally {
      setRemoving(false);
    }
  };

  return {
    showRemoveConfirm,
    setShowRemoveConfirm,
    removing,
    cloudFavState,
    setCloudFavState,
    cloudFavLoading,
    handleCloudFavoriteToggle,
    handleCloudRemove,
  };
}
