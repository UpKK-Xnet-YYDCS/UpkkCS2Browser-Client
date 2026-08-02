import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import type { ServerStatus, Player } from '@/types';
import { getServerPlayers, getServerDetail, removeFavorite as apiRemoveFavorite, addFavorite as apiAddFavorite, checkFavorite as apiCheckFavorite } from '@/api';
import { useI18n } from '@/hooks/useI18n';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { formatServerDate, getLastResponseTimestamp, getOfflineDuration, isServerOnline } from '@/utils/serverStatus';

const AutoJoinModal = lazy(() => import('./AutoJoinModal').then(module => ({ default: module.AutoJoinModal })));
const JoinServerConfirmModal = lazy(() => import('./JoinServerConfirmModal').then(module => ({ default: module.JoinServerConfirmModal })));
const LatencyProbeModal = lazy(() => import('./LatencyProbeModal').then(module => ({ default: module.LatencyProbeModal })));
const PlayerHistoryChart = lazy(() => import('./PlayerHistoryChart').then(module => ({ default: module.PlayerHistoryChart })));
const MapHistory = lazy(() => import('./MapHistory').then(module => ({ default: module.MapHistory })));
const QueryRecords = lazy(() => import('./QueryRecords').then(module => ({ default: module.QueryRecords })));

interface ServerDetailModalProps {
  server: ServerStatus;
  onClose: () => void;
  /** Whether this server is a cloud favorite (enables remove button in header) */
  isCloudFavorite?: boolean;
  /** Callback after cloud favorite is removed */
  onFavoriteRemoved?: () => void;
}

// Icons
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const AutoJoinIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const LatencyProbeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16M7 15l3-4 3 2 4-7" />
  </svg>
);

const WifiOffIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M8.53 8.56A8.96 8.96 0 0112 7c2.39 0 4.68.94 6.36 2.64M5.64 5.64A13.93 13.93 0 0112 4c3.87 0 7.37 1.57 9.9 4.1M12 20h.01" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
  </svg>
);

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ServerDetailModal({ server, onClose, isCloudFavorite, onFavoriteRemoved }: ServerDetailModalProps) {
  const { isLoggedIn } = useCloudAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn);
  const [copied, setCopied] = useState(false);
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [showLatencyProbeModal, setShowLatencyProbeModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cloudFavState, setCloudFavState] = useState<boolean | null>(isCloudFavorite ?? null);
  const [cloudFavLoading, setCloudFavLoading] = useState(false);
  const [detailVersion, setDetailVersion] = useState(server.version || server.Version || '');
  const { t, language } = useI18n();

  // Get server data with fallbacks for API format differences
  const serverIp = server.ip || server.Addr || '';
  const serverPort = server.port || server.Port || '';
  const serverName = server.name || server.Name || 'Unknown Server';
  const serverMap = server.map_name || server.Map || 'Unknown';
  const serverPlayers = server.players ?? server.Players ?? 0;
  const serverMaxPlayers = server.max_players ?? server.MaxPlayers ?? 0;
  const serverBots = server.bots ?? server.Bots ?? 0;
  const serverCountry = server.country_name || server.Country || '';
  const serverVac = server.vac ?? server.VAC ?? false;
  const serverVersion = detailVersion;
  // If display_address exists (IP/domain without port), append port; otherwise fallback to ip:port
  // Strip any trailing port from display_address to avoid duplication (e.g. "1.1.1.1:29667:29667")
  const rawBaseAddress = server.display_address || serverIp;
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  const displayAddress = serverPort ? `${baseAddress}:${serverPort}` : baseAddress;
  const serverGame = server.game || server.GameDesc || '';
  const serverCategory = server.category || server.Category || '';
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

  const fetchPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const result = await getServerPlayers(server.ID || `${serverIp}:${serverPort}`);
      if (result && typeof result === 'object') {
        if ('is_authenticated' in result) {
          setIsAuthenticated(Boolean((result as Record<string, unknown>).is_authenticated));
        }
        if ('players' in result) {
          setPlayers((result as { players: Player[] }).players || []);
        } else if (Array.isArray(result)) {
          setPlayers(result);
        }
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  }, [server.ID, serverIp, serverPort]);

  useEffect(() => {
    const timers: number[] = [];
    if (isLoggedIn) {
      // Check cloud favorite status if not already known
      if (cloudFavState === null && serverIp && serverPort) {
        apiCheckFavorite(String(serverIp), String(serverPort))
          .then(result => setCloudFavState(result.is_favorite))
          .catch(() => {});
      }
    }
    if (serverPlayers > 0) {
      const timer = window.setTimeout(() => {
        void fetchPlayers();
      }, 0);
      timers.push(timer);
    }
    // Fetch server detail to get version if not already available
    if (!detailVersion && serverIp && serverPort) {
      getServerDetail(`${serverIp}:${serverPort}`)
        .then(detail => {
          if (detail?.version) setDetailVersion(detail.version);
        })
        .catch(() => {});
    }
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [cloudFavState, detailVersion, fetchPlayers, isLoggedIn, serverIp, serverPlayers, serverPort]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add/remove cloud favorite from detail modal
  const handleCloudFavoriteToggle = async () => {
    if (cloudFavState) {
      // Show confirmation before removing from cloud
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

  // Remove from cloud favorites
  const handleCloudRemove = async () => {
    setRemoving(true);
    try {
      await apiRemoveFavorite(serverIp, String(serverPort));
      setCloudFavState(false);
      setShowRemoveConfirm(false);
      // Only close modal if triggered from cloud favorites page header button
      if (isCloudFavorite) {
        onClose();
      }
      onFavoriteRemoved?.();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    } finally {
      setRemoving(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const playerPercent = serverMaxPlayers > 0 
    ? Math.round((serverPlayers / serverMaxPlayers) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold truncate">{serverName}</h2>
                {isCloudFavorite && (
                  <button
                    onClick={() => setShowRemoveConfirm(true)}
                    className="shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-colors text-red-300 hover:text-red-100"
                    title={t.removeFavorite}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-blue-100 text-sm mt-1">{displayAddress}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!serverOnline && (
            <div className="relative overflow-hidden mb-5 p-4 rounded-xl bg-slate-950 text-slate-100 border border-white/10 shadow-lg">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/40 via-white/10 to-transparent" />
              <div className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-4 items-start">
                <div className="grid place-items-center w-12 h-12 rounded-xl bg-white/10 border border-white/10 text-slate-200">
                  <WifiOffIcon />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-red-200/80">{t.offline}</div>
                  <h3 className="mt-1 text-lg font-black text-white">{t.serverOfflineTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{t.serverOfflineDescription}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offlineDuration && (
                      <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white">
                        <ClockIcon />
                        <span>
                          <small className="block text-[11px] font-medium text-slate-400">{t.serverOfflineDuration}</small>
                          {offlineDuration}
                        </span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white">
                      <ClockIcon />
                      <span>
                        <small className="block text-[11px] font-medium text-slate-400">{t.serverLastResponse}</small>
                        {lastResponseText}
                      </span>
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 justify-self-start sm:justify-self-end rounded-full border border-red-400/20 bg-red-950/50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.16)]" />
                  {t.offline}
                </span>
              </div>
            </div>
          )}

          {/* Server Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailMap}</div>
              <div className="font-semibold text-gray-900 dark:text-white">{serverMap}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailPlayers}</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {serverPlayers}/{serverMaxPlayers}
                {serverBots > 0 && <span className="text-gray-400 text-sm ml-1">(+{serverBots} bot)</span>}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailGame}</div>
              <div className="font-semibold text-gray-900 dark:text-white">{serverGame || 'N/A'}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailCategory}</div>
              <div className="font-semibold text-gray-900 dark:text-white">{serverCategory || 'N/A'}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailCountry}</div>
              <div className="font-semibold text-gray-900 dark:text-white">{serverCountry || 'Unknown'}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailVersion}</div>
              <div className="font-semibold text-gray-900 dark:text-white">{serverVersion || 'N/A'}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t.serverDetailLoad}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{playerPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  playerPercent >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                  playerPercent >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                  playerPercent > 0 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
                  'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{ width: `${playerPercent}%` }}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {serverVac && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-lg">
                {t.serverDetailVac}
              </span>
            )}
            {server.password && (
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-bold rounded-lg">
                {t.serverDetailPassword}
              </span>
            )}
          </div>

          {/* Player List - Enhanced Layout */}
          {serverPlayers > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t.serverDetailOnlinePlayers} ({serverPlayers})
                  </h3>
                  {isAuthenticated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {t.authenticatedView}
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchPlayers}
                  disabled={loadingPlayers}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <RefreshIcon spinning={loadingPlayers} />
                </button>
              </div>
              {loadingPlayers ? (
                <div className="text-center py-4 text-gray-500">{t.serverDetailLoading}</div>
              ) : players.length > 0 ? (
                <div className="space-y-1">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span>{t.serverDetailOnlinePlayers}</span>
                    <span className="w-16 text-center">{t.playerScore}</span>
                    <span className="w-24 text-right">{t.playerDuration}</span>
                  </div>
                  {/* Player rows */}
                  <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                    {players
                      .filter(p => {
                        const name = p.Name || p.name;
                        return name && name !== '未知' && name !== 'Unknown';
                      })
                      .map((player, index) => {
                        const pName = player.Name || player.name || '?';
                        const pScore = player.Score ?? player.score ?? 0;
                        const pDuration = player.Duration ?? player.duration ?? 0;
                        const duration = player.DurationStr || formatDuration(pDuration);
                        return (
                          <div
                            key={index}
                            className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {pName[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {pName}
                              </span>
                            </div>
                            <span className="w-16 text-center text-sm font-mono text-gray-600 dark:text-gray-300">
                              {pScore}
                            </span>
                            <span className="w-24 text-right text-xs text-gray-500 dark:text-gray-400">
                              {duration}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>{t.serverDetailNoPlayers}</p>
                  {!isAuthenticated && <p className="text-xs mt-1">{t.serverDetailLoginToView}</p>}
                </div>
              )}
            </div>
          )}

          {/* Player History Chart */}
          {(server.ID || (serverIp && serverPort)) && (
            <div className="mb-6">
              <Suspense fallback={<div className="h-32" />}>
                <PlayerHistoryChart serverId={server.ID ? String(server.ID) : `${serverIp}:${serverPort}`} />
              </Suspense>
            </div>
          )}

          {/* Map Change History */}
          {serverIp && serverPort && (
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t.serverDetailMapHistory}</h3>
                </div>
                <Suspense fallback={<div className="h-20" />}>
                  <MapHistory serverAddress={`${serverIp}:${serverPort}`} />
                </Suspense>
              </div>
            </div>
          )}

          {/* Query Records & Latency */}
          {serverIp && serverPort && (
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="font-semibold text-gray-900 dark:text-white">📊 {t.queryRecordsTitle}</h3>
                  </div>
                  <p className="text-xs leading-5 text-blue-700 dark:text-blue-300 md:max-w-sm md:text-right">
                    {t.queryRecordsNodeNotice}
                  </p>
                </div>
                <Suspense fallback={<div className="h-24" />}>
                  <QueryRecords serverAddress={`${serverIp}:${serverPort}`} />
                </Suspense>
              </div>
            </div>
          )}

          {/* Cloud Favorite Status */}
          {isAuthenticated && cloudFavState !== null && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill={cloudFavState ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.cloudFavorites}
                  </span>
                </div>
                <button
                  onClick={handleCloudFavoriteToggle}
                  disabled={cloudFavLoading}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    cloudFavState
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  } disabled:opacity-50`}
                >
                  {cloudFavLoading ? '...' : cloudFavState ? t.removeFavorite : t.addToFavorites}
                </button>
              </div>
            </div>
          )}

          {/* Comments */}
          {server.comments && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.serverDetailNotes}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{server.comments}</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowLatencyProbeModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold rounded-xl transition-all"
            title={t.latencyProbeOpen}
            aria-label={t.latencyProbeOpen}
          >
            <LatencyProbeIcon />
            <span className="hidden sm:inline">{t.latencyProbeOpen}</span>
          </button>
          <button
            onClick={() => setShowAutoJoinModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            title={t.autoJoinButton}
            aria-label={t.autoJoinButton}
          >
            <AutoJoinIcon />
          </button>
          <button
            onClick={() => setShowJoinConfirm(true)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <PlayIcon />
            {t.joinServer}
          </button>
          <button
            onClick={handleCopyAddress}
            className={`px-4 py-3 rounded-xl transition-all ${
              copied 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={t.copyAddress}
          >
            <CopyIcon />
          </button>
        </div>
      </div>

      {/* Auto-Join Modal */}
      {showAutoJoinModal && (
        <Suspense fallback={null}>
          <AutoJoinModal
            server={server}
            onClose={() => setShowAutoJoinModal(false)}
          />
        </Suspense>
      )}

      {showJoinConfirm && (
        <Suspense fallback={null}>
          <JoinServerConfirmModal
            server={server}
            latencyMs={server.local_latency_ms}
            onClose={() => setShowJoinConfirm(false)}
          />
        </Suspense>
      )}

      {showLatencyProbeModal && (
        <Suspense fallback={null}>
          <LatencyProbeModal
            server={server}
            onClose={() => setShowLatencyProbeModal(false)}
          />
        </Suspense>
      )}

      {/* Remove Favorite Confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setShowRemoveConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t.confirmRemoveFavorite}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t.confirmRemoveFavoriteDesc}</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-4">{serverName}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleCloudRemove}
                disabled={removing}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
              >
                {removing ? '...' : t.removeFavorite}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
