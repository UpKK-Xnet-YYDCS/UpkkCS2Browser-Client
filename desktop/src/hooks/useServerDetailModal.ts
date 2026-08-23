import { useEffect, useState } from 'react';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useI18n } from '@/hooks/useI18n';
import { useServerActionModals } from '@/hooks/useServerActionModals';
import { useServerDetailCloudFavorite } from '@/hooks/useServerDetailCloudFavorite';
import { useServerDetailPrefetch } from '@/hooks/useServerDetailPrefetch';
import { getPlayerLoadPercent, resolveServerPresentation } from '@/services/serverPresentation';
import {
  SERVER_DETAIL_COPY_FEEDBACK_MS,
  buildServerDetailHistoryKeys,
} from '@/services/serverDetailQuery';
import type { ServerStatus } from '@/types';
import { formatServerDate, getLastResponseTimestamp, getOfflineDuration, isServerOnline } from '@/utils/serverStatus';

interface UseServerDetailModalOptions {
  server: ServerStatus;
  isCloudFavorite?: boolean;
  onFavoriteRemoved?: () => void;
  onClose: () => void;
}

export function useServerDetailModal({
  server,
  isCloudFavorite,
  onFavoriteRemoved,
  onClose,
}: UseServerDetailModalOptions) {
  const { isLoggedIn } = useCloudAuth();
  const [copied, setCopied] = useState(false);
  const {
    showAutoJoinModal, showJoinConfirm, showLatencyProbeModal,
    setShowAutoJoinModal, setShowLatencyProbeModal,
    openJoinConfirm, closeAutoJoin, closeJoinConfirm, closeLatency,
  } = useServerActionModals();
  const { t, language } = useI18n();

  const presentation = resolveServerPresentation(server);
  const serverIp = String(presentation.serverIp);
  const serverPort = String(presentation.serverPort);
  const displayAddress = presentation.displayAddress;
  const serverName = presentation.serverName;
  const serverMap = presentation.serverMap;
  const serverPlayers = presentation.serverPlayers;
  const serverMaxPlayers = presentation.serverMaxPlayers;
  const serverBots = presentation.serverBots;
  const serverCountry = presentation.serverCountry;
  const serverVac = presentation.serverVac;
  const serverGame = presentation.serverGame;
  const serverCategory = presentation.serverCategory;
  const serverOnline = isServerOnline(server);
  const offlineDuration = serverOnline ? '' : getOfflineDuration(server, {
    secondsAgo: t.secondsAgo,
    minutesAgo: t.minutesAgo,
    hoursAgo: t.hoursAgo,
    minuteUnit: t.minuteUnit,
    hourUnit: t.hourUnit,
    dayUnit: t.dayUnit,
  });
  const lastResponseTimestamp = getLastResponseTimestamp(server);
  const lastResponseText = formatServerDate(lastResponseTimestamp, language) || 'N/A';
  const { historyServerId, historyAddress } = buildServerDetailHistoryKeys(server.ID, serverIp, serverPort);
  const playerPercent = getPlayerLoadPercent(serverPlayers, serverMaxPlayers);

  const {
    showRemoveConfirm,
    setShowRemoveConfirm,
    removing,
    cloudFavState,
    setCloudFavState,
    cloudFavLoading,
    handleCloudFavoriteToggle,
    handleCloudRemove,
  } = useServerDetailCloudFavorite({
    serverIp,
    serverPort,
    serverName,
    isCloudFavorite,
    onFavoriteRemoved,
    onClose,
  });

  const {
    players,
    loadingPlayers,
    isAuthenticated,
    detailVersion,
    fetchPlayers,
  } = useServerDetailPrefetch({
    serverId: server.ID,
    serverIp,
    serverPort,
    serverPlayers,
    isLoggedIn,
    initialVersion: server.version || server.Version || '',
    cloudFavState,
    setCloudFavState,
  });

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), SERVER_DETAIL_COPY_FEEDBACK_MS);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return {
    t,
    players,
    loadingPlayers,
    isAuthenticated,
    copied,
    showAutoJoinModal,
    showJoinConfirm,
    showLatencyProbeModal,
    setShowAutoJoinModal,
    setShowLatencyProbeModal,
    openJoinConfirm,
    closeAutoJoin,
    closeJoinConfirm,
    closeLatency,
    showRemoveConfirm,
    setShowRemoveConfirm,
    removing,
    cloudFavState,
    cloudFavLoading,
    displayAddress,
    serverName,
    serverMap,
    serverPlayers,
    serverMaxPlayers,
    serverBots,
    serverCountry,
    serverVac,
    serverGame,
    serverCategory,
    serverVersion: detailVersion,
    serverOnline,
    offlineDuration,
    lastResponseText,
    historyServerId,
    historyAddress,
    playerPercent,
    fetchPlayers,
    handleCopyAddress,
    handleCloudFavoriteToggle,
    handleCloudRemove,
  };
}
