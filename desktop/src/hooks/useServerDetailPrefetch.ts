import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { checkFavorite as apiCheckFavorite } from '@/api/favorites';
import { getServerDetail, getServerPlayers } from '@/api/servers';
import { parseServerPlayersResult } from '@/services/serverPresentation';
import {
  playersQueryKey,
  shouldPrefetchCloudFavorite,
  shouldPrefetchPlayers,
  shouldPrefetchServerVersion,
} from '@/services/serverDetailQuery';
import type { Player } from '@/types';

interface UseServerDetailPrefetchOptions {
  serverId?: number;
  serverIp: string;
  serverPort: string;
  serverPlayers: number;
  isLoggedIn: boolean;
  initialVersion: string;
  cloudFavState: boolean | null;
  setCloudFavState: Dispatch<SetStateAction<boolean | null>>;
}

export function useServerDetailPrefetch({
  serverId,
  serverIp,
  serverPort,
  serverPlayers,
  isLoggedIn,
  initialVersion,
  cloudFavState,
  setCloudFavState,
}: UseServerDetailPrefetchOptions) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn);
  const [detailVersion, setDetailVersion] = useState(initialVersion);

  const fetchPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const result = await getServerPlayers(playersQueryKey(serverId, serverIp, serverPort));
      const parsed = parseServerPlayersResult(result);
      if (parsed.isAuthenticated !== undefined) setIsAuthenticated(parsed.isAuthenticated);
      if (parsed.players) setPlayers(parsed.players);
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  }, [serverId, serverIp, serverPort]);

  // Three independent prefetches, each keyed only on its own inputs: the cloud
  // favorite and version results must not re-trigger the player-list fetch.
  useEffect(() => {
    if (shouldPrefetchCloudFavorite(isLoggedIn, cloudFavState, serverIp, serverPort)) {
      apiCheckFavorite(String(serverIp), String(serverPort))
        .then(result => setCloudFavState(result.is_favorite))
        .catch(() => {});
    }
  }, [cloudFavState, isLoggedIn, serverIp, serverPort, setCloudFavState]);

  useEffect(() => {
    if (!shouldPrefetchPlayers(serverPlayers)) return undefined;
    const timer = window.setTimeout(() => {
      void fetchPlayers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPlayers, serverPlayers]);

  useEffect(() => {
    if (shouldPrefetchServerVersion(detailVersion, serverIp, serverPort)) {
      getServerDetail(serverIp + ':' + serverPort)
        .then(detail => {
          if (detail?.version) setDetailVersion(detail.version);
        })
        .catch(() => {});
    }
  }, [detailVersion, serverIp, serverPort]);

  return {
    players,
    loadingPlayers,
    isAuthenticated,
    detailVersion,
    fetchPlayers,
  };
}
