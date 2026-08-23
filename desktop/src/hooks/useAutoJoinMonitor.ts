import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshServer } from '@/api/servers';
import { isTauriAvailable, queryServerA2S } from '@/services/a2s';
import {
  AUTO_JOIN_SUCCESS_CLOSE_MS,
  formatAutoJoinCountLog,
  formatAutoJoinDetectedStatus,
  formatAutoJoinSteamLog,
  formatAutoJoinUsingLog,
  formatAutoJoinWaitingStatus,
  openAutoJoinSteamUrl,
  queryAutoJoinCounts,
  shouldJoinFromCounts,
} from '@/services/autoJoinCheck';
import {
  AUTO_JOIN_DEFAULT_INTERVAL,
  AUTO_JOIN_DEFAULT_MAX_PLAYERS,
  AUTO_JOIN_INTERVAL_KEY,
  AUTO_JOIN_MIN_SLOTS_KEY,
  autoJoinAvailableSlots,
  clampAutoJoinInterval,
  clampAutoJoinMinSlots,
  nextAutoJoinCountdown,
  readStoredAutoJoinInterval,
  readStoredAutoJoinMinSlots,
} from '@/services/autoJoinPolicy';
import { openExternalUrl } from '@/services/desktopRuntime';
import { resolveServerAddress } from '@/services/serverPresentation';
import { createSequentialPoller, type SequentialPoller } from '@/services/sequentialPoller';
import { buildJoinUrl } from '@/services/steamClient';
import { logDebug, logError, logInfo, logWarn } from '@/services/operationLog';
import type { Translations } from '@/store/i18n';
import type { ServerStatus } from '@/types';

interface UseAutoJoinMonitorOptions {
  server: ServerStatus;
  t: Translations;
  onClose: () => void;
  autoStart?: boolean;
}

export function useAutoJoinMonitor({ server, t, onClose, autoStart = false }: UseAutoJoinMonitorOptions) {
  const { serverIp, serverPort, baseAddress } = resolveServerAddress(server);
  const serverName = server.name || server.Name || 'Unknown Server';
  const serverMaxPlayers = server.max_players ?? server.MaxPlayers ?? AUTO_JOIN_DEFAULT_MAX_PLAYERS;

  const [minSlots, setMinSlots] = useState(() => readStoredAutoJoinMinSlots(localStorage));
  const [checkInterval, setCheckInterval] = useState(() => readStoredAutoJoinInterval(localStorage));
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_JOIN_DEFAULT_INTERVAL);
  const [statusText, setStatusText] = useState('');
  const [currentPlayers, setCurrentPlayers] = useState(server.players ?? server.Players ?? 0);
  const [currentMaxPlayers, setCurrentMaxPlayers] = useState(serverMaxPlayers);

  const pollerRef = useRef<SequentialPoller | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMonitoringRef = useRef(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);

  const doStopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
    setIsMonitoring(false);
    setStatusText('');
    pollerRef.current?.stop();
    pollerRef.current = null;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      pollerRef.current?.stop();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const checkServer = useCallback(async (): Promise<boolean> => {
    if (!isMonitoringRef.current) return false;

    setStatusText(t.autoJoinChecking);

    try {
      const outcome = await queryAutoJoinCounts({
        ip: String(serverIp),
        port: String(serverPort),
        isTauriAvailable,
        queryA2S: queryServerA2S,
        refreshServer,
      });

      if (outcome.ok) {
        logInfo('AutoJoin', formatAutoJoinCountLog(outcome.source === 'a2s' ? 'A2S' : 'API', String(serverIp), String(serverPort), outcome.counts));
        logDebug('AutoJoin', formatAutoJoinUsingLog(outcome.source, outcome.counts));

        const { availableSlots, shouldJoin } = shouldJoinFromCounts(outcome.counts, minSlots);
        setCurrentPlayers(outcome.counts.realPlayers);
        setCurrentMaxPlayers(outcome.counts.maxPlayers);

        if (shouldJoin) {
          setStatusText(formatAutoJoinDetectedStatus(t.autoJoinDetected, availableSlots, minSlots));
          const steamUrl = buildJoinUrl(baseAddress, serverPort, server.game_id ?? server.GameID, server.game);
          logInfo('AutoJoin', formatAutoJoinSteamLog(server.name, steamUrl));
          const opened = await openAutoJoinSteamUrl(steamUrl, {
            isTauriAvailable,
            openExternalUrl,
            assignLocation: (url) => { window.location.href = url; },
          });
          if (opened.fallbackError) {
            const error = opened.fallbackError;
            logError('AutoJoin', 'Failed to open Steam: ' + (error instanceof Error ? error.message : String(error)));
            console.error('Failed to open Steam:', error);
          }
          setTimeout(() => {
            doStopMonitoring();
            onClose();
          }, AUTO_JOIN_SUCCESS_CLOSE_MS);
          return false;
        }
        setStatusText(formatAutoJoinWaitingStatus(t.autoJoinWaiting, outcome.counts.realPlayers, outcome.counts.maxPlayers));
      } else {
        logWarn('AutoJoin', 'Query failed for ' + serverIp + ':' + serverPort);
        setStatusText(t.autoJoinCheckFailed);
      }
    } catch (error) {
      logError('AutoJoin', 'Check failed: ' + (error instanceof Error ? error.message : String(error)));
      console.error('Auto-join check failed:', error);
      setStatusText(t.autoJoinCheckFailed);
    }

    setCountdown(checkInterval);
    return true;
  }, [serverIp, serverPort, baseAddress, minSlots, onClose, t, checkInterval, server.game_id, server.GameID, server.game, server.name, doStopMonitoring]);

  const startMonitoring = useCallback(() => {
    localStorage.setItem(AUTO_JOIN_MIN_SLOTS_KEY, String(minSlots));
    localStorage.setItem(AUTO_JOIN_INTERVAL_KEY, String(checkInterval));
    isMonitoringRef.current = true;
    setIsMonitoring(true);
    setCountdown(checkInterval);
    pollerRef.current?.stop();
    pollerRef.current = createSequentialPoller(checkServer, checkInterval * 1000);
    pollerRef.current.start();
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => nextAutoJoinCountdown(prev, checkInterval));
    }, 1000);
  }, [minSlots, checkInterval, checkServer]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startMonitoring();
  }, [autoStart, startMonitoring]);

  const handleToggle = () => {
    if (isMonitoring) doStopMonitoring();
    else startMonitoring();
  };

  const handleMinSlotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinSlots(clampAutoJoinMinSlots(e.target.value));
  };

  const handleCheckIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckInterval(clampAutoJoinInterval(e.target.value));
  };

  return {
    serverName,
    minSlots,
    checkInterval,
    isMonitoring,
    countdown,
    statusText,
    currentPlayers,
    currentMaxPlayers,
    availableSlots: autoJoinAvailableSlots(currentPlayers, currentMaxPlayers),
    handleToggle,
    handleMinSlotsChange,
    handleCheckIntervalChange,
  };
}
