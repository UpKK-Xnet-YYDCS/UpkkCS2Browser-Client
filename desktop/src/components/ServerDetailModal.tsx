import { useState, useEffect } from 'react';
import type { ServerStatus, Player } from '@/types';
import { getServerPlayers, getServerDetail, removeFavorite as apiRemoveFavorite, addFavorite as apiAddFavorite, checkFavorite as apiCheckFavorite, getApiToken } from '@/api';
import { useI18n } from '@/store/i18n';
import { buildJoinUrl } from './SteamClientSwitch';
import { AutoJoinModal } from './AutoJoinModal';
import { PlayerHistoryChart } from './PlayerHistoryChart';
import { MapHistory } from './MapHistory';
import { QueryRecords } from './QueryRecords';

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
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ServerDetailModal({ server, onClose, isCloudFavorite, onFavoriteRemoved }: ServerDetailModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cloudFavState, setCloudFavState] = useState<boolean | null>(isCloudFavorite ?? null);
  const [cloudFavLoading, setCloudFavLoading] = useState(false);
  const [detailVersion, setDetailVersion] = useState(server.version || server.Version || '');
  const { t } = useI18n();

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

  const fetchPlayers = async () => {
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
  };

  useEffect(() => {
    // Check if user has API token (authenticated)
    const token = getApiToken();
    if (token) {
      setIsAuthenticated(true);
      // Check cloud favorite status if not already known
      if (cloudFavState === null && serverIp && serverPort) {
        apiCheckFavorite(String(serverIp), String(serverPort))
          .then(result => setCloudFavState(result.is_favorite))
          .catch(() => {});
      }
    }
    if (serverPlayers > 0) {
      fetchPlayers();
    }
    // Fetch server detail to get version if not already available
    if (!detailVersion && serverIp && serverPort) {
      getServerDetail(`${serverIp}:${serverPort}`)
        .then(detail => {
          if (detail?.version) setDetailVersion(detail.version);
        })
        .catch(() => {});
    }
  }, []);

  const handleConnect = async () => {
    // 使用 buildJoinUrl 函数获取正确的协议（steam:// 或 steamchina://）
    const steamUrl = buildJoinUrl(serverIp, serverPort, server.game_id ?? server.GameID, server.game);
    // Try Tauri shell:open first, fallback to window.location
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(steamUrl);
      } else {
        window.location.href = steamUrl;
      }
    } catch (error) {
      console.error('Failed to open Steam:', error);
      // Fallback to direct link
      window.location.href = steamUrl;
    }
  };

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
              <PlayerHistoryChart serverId={server.ID ? String(server.ID) : `${serverIp}:${serverPort}`} />
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
                <MapHistory serverAddress={`${serverIp}:${serverPort}`} />
              </div>
            </div>
          )}

          {/* Query Records & Latency */}
          {serverIp && serverPort && (
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 dark:text-white">📊 {t.queryRecordsTitle}</h3>
                </div>
                <QueryRecords serverAddress={`${serverIp}:${serverPort}`} />
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
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setShowAutoJoinModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            title={t.autoJoinButton}
            aria-label={t.autoJoinButton}
          >
            <AutoJoinIcon />
          </button>
          <button
            onClick={handleConnect}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
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
        <AutoJoinModal
          server={server}
          onClose={() => setShowAutoJoinModal(false)}
        />
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
