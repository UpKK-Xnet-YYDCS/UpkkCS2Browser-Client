import type { ServerStatus } from '@/types';
import { useAppStore } from '@/store';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as api from '@/api';
import { buildJoinUrl } from './SteamClientSwitch';
import { AutoJoinModal } from './AutoJoinModal';
import { useI18n } from '@/store/i18n';

// API base URL for map images
const API_BASE_URL = 'https://servers.upkk.com';
const DEFAULT_MAP_IMAGE = `${API_BASE_URL}/mapimage/default_1.webp`;

// Simple inline SVG icons
const Icons = {
  Users: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Star: ({ filled }: { filled?: boolean }) => (
    <svg className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Loading: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  AutoJoin: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  MultiServer: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
};

// Get map preview image URL - follows same pattern as web template
const getMapImageUrl = (mapName: string, mapImageUrl?: string): string => {
  // If API provides map_image_url, use it with full URL
  if (mapImageUrl) {
    // If it's a relative URL, prepend API base
    if (mapImageUrl.startsWith('/')) {
      return `${API_BASE_URL}${mapImageUrl}.webp`;
    }
    return mapImageUrl;
  }
  
  // Fallback: construct URL from map name (same as web template)
  if (mapName) {
    return `${API_BASE_URL}/mapimage/${encodeURIComponent(mapName)}.webp`;
  }
  
  return DEFAULT_MAP_IMAGE;
};

interface ServerCardProps {
  server: ServerStatus;
  onClick?: () => void;
  onFavoriteChange?: () => void;
  hideCloudFavorite?: boolean;
}

export function ServerCard({ server, onClick, onFavoriteChange, hideCloudFavorite }: ServerCardProps) {
  const { isFavorite: isLocalFavorite, addFavorite: addLocalFavorite, removeFavorite: removeLocalFavorite } = useAppStore();
  const { t } = useI18n();
  const [imageError, setImageError] = useState(false);
  const [isCloudFavorite, setIsCloudFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);
  const [autoJoinTarget, setAutoJoinTarget] = useState<ServerStatus | null>(null);
  const [showCloudPrompt, setShowCloudPrompt] = useState<'add' | 'remove' | null>(null);
  const [showMultiServerDropdown, setShowMultiServerDropdown] = useState(false);
  const multiServerRef = useRef<HTMLDivElement>(null);
  const multiServerBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  
  const alternates = server.alternate_servers;
  const hasAlternates = alternates && alternates.length > 0;

  // Close multi-server dropdown when clicking outside
  useEffect(() => {
    if (!showMultiServerDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (multiServerRef.current && !multiServerRef.current.contains(e.target as Node) &&
          multiServerBtnRef.current && !multiServerBtnRef.current.contains(e.target as Node)) {
        setShowMultiServerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMultiServerDropdown]);
  
  // Handle both old (PascalCase) and new (snake_case) API formats
  const serverIp = server.ip || server.Addr || '';
  const serverPort = server.port || server.Port || '';
  const serverName = server.name || server.Name || 'Unknown Server';
  const serverMap = server.map_name || server.Map || 'Unknown';
  const serverPlayers = server.players ?? server.Players ?? 0;
  const serverMaxPlayers = server.max_players ?? server.MaxPlayers ?? 0;
  const serverBots = server.bots ?? server.Bots ?? 0;
  const serverCountry = server.country_name || server.Country || '';
  const serverCountryCode = server.country_code || server.CountryCode || '';
  const serverVac = server.vac ?? server.VAC ?? false;
  // Online status: check if server has a game type or max_players > 0 (server is responding)
  // Players count of 0 does NOT mean offline - empty servers are still online
  const serverOnline = Boolean(server.game) || serverMaxPlayers > 0 || server.Online === true;
  // Always show address:port format - display_address from API may only contain IP/domain without port
  // Strip any trailing port from display_address to avoid duplication (e.g. "1.1.1.1:29667:29667")
  const rawBaseAddress = server.display_address || serverIp;
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  const displayAddress = serverPort ? `${baseAddress}:${serverPort}` : baseAddress;
  
  // Check auth status and cloud favorite status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const authStatus = await api.checkAuthStatus();
        setIsLoggedIn(authStatus.logged_in);
        
        if (authStatus.logged_in && serverIp && serverPort) {
          const favoriteStatus = await api.checkFavorite(String(serverIp), String(serverPort));
          setIsCloudFavorite(favoriteStatus.is_favorite);
        }
      } catch {
        // Ignore errors - use local favorites
      }
    };
    checkStatus();
  }, [serverIp, serverPort]);
  
  // Show local favorite state (always up-to-date since we toggle it immediately)
  // Use baseAddress (from display_address) to keep domain names consistent
  const favoriteAddr = serverPort ? `${baseAddress}:${serverPort}` : baseAddress;
  const localFav = isLocalFavorite(favoriteAddr);
  const favorite = localFav || isCloudFavorite;
  
  const playerPercent = serverMaxPlayers > 0 
    ? Math.round((serverPlayers / serverMaxPlayers) * 100) 
    : 0;
  
  const getPlayerGradient = () => {
    if (playerPercent >= 80) return 'from-green-400 to-emerald-500';
    if (playerPercent >= 50) return 'from-yellow-400 to-orange-500';
    if (playerPercent > 0) return 'from-blue-400 to-cyan-500';
    return 'from-gray-300 to-gray-400';
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const addr = favoriteAddr;
    const currentlyFavorite = favorite;
    
    // Always toggle local favorite immediately
    if (currentlyFavorite) {
      removeLocalFavorite(addr);
    } else {
      addLocalFavorite(addr);
    }
    
    // If logged in, prompt for cloud favorite sync
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
        await api.addFavorite(String(serverIp), String(serverPort), serverName);
        setIsCloudFavorite(true);
      } else {
        await api.removeFavorite(String(serverIp), String(serverPort));
        setIsCloudFavorite(false);
      }
      onFavoriteChange?.();
    } catch (error) {
      console.error('Failed to update cloud favorite:', error);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleAutoJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAutoJoinTarget(null);
    setShowAutoJoinModal(true);
  };

  const handleAutoJoinAlternate = (ip: string, port: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAutoJoinTarget({ ...server, ip, port: String(port) } as ServerStatus);
    setShowAutoJoinModal(true);
    setShowMultiServerDropdown(false);
  };

  const handleConnectAlternate = (ip: string, port: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const steamUrl = buildJoinUrl(ip, port, server.game_id ?? server.GameID, server.game);
    window.open(steamUrl, '_blank');
    setShowMultiServerDropdown(false);
  };

  const handleMultiServerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showMultiServerDropdown && multiServerBtnRef.current) {
      const rect = multiServerBtnRef.current.getBoundingClientRect();
      const dropdownWidth = 320; // w-80 = 20rem = 320px
      let left = rect.left;
      // Prevent right-side overflow
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      // Prevent left-side overflow
      if (left < 8) left = 8;
      setDropdownPos({ top: rect.top - 4, left });
    }
    setShowMultiServerDropdown(prev => !prev);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Get map image URL from API or construct it
  const mapImageUrl = getMapImageUrl(serverMap, server.map_image_url);

  return (
    <div 
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 hover:scale-[1.02]"
      onClick={onClick}
    >
      {/* Map Preview Banner - using real map image like web template */}
      <div className="h-32 relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        <img 
          src={imageError ? DEFAULT_MAP_IMAGE : mapImageUrl}
          alt={serverMap}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        
        {/* Map name on image */}
        <div className="absolute bottom-2 left-2 right-16">
          <span className="text-white text-sm font-bold truncate block drop-shadow-lg">
            {serverMap}
          </span>
        </div>
        
        {/* Player count overlay */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg flex items-center gap-1.5">
          <Icons.Users />
          <span className="text-white text-xs font-bold">
            {serverPlayers}/{serverMaxPlayers}
          </span>
        </div>
        
        {/* Favorite button */}
        {!hideCloudFavorite && (
        <button
          onClick={handleFavoriteClick}
          disabled={isFavoriteLoading}
          className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-sm transition-all duration-200 ${
            isFavoriteLoading
              ? 'text-gray-400 bg-black/40'
              : favorite 
                ? 'text-yellow-400 bg-black/40 scale-110' 
                : 'text-white/70 bg-black/30 hover:text-yellow-400 hover:bg-black/50 hover:scale-110'
          }`}
          title={isLoggedIn ? (favorite ? '取消云端收藏' : '添加到云端收藏') : (favorite ? '取消本地收藏' : '添加到本地收藏')}
        >
          {isFavoriteLoading ? <Icons.Loading /> : <Icons.Star filled={favorite} />}
        </button>
        )}
        
        {/* Status indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
          <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-white text-xs font-medium">{serverOnline ? t.online : t.offline}</span>
        </div>
      </div>
      
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {serverName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              {displayAddress}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {serverVac && (
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md font-bold">
                VAC
              </span>
            )}
          </div>
        </div>

        {/* Info Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {serverCountryCode && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700/50 rounded-lg text-gray-600 dark:text-gray-300 text-xs font-medium">
              <Icons.Globe />
              {serverCountry || serverCountryCode}
            </span>
          )}
          {server.game && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-lg text-purple-700 dark:text-purple-400 text-xs font-medium">
              {server.game}
            </span>
          )}
          {server.category && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-lg text-blue-700 dark:text-blue-400 text-xs font-medium">
              {server.category}
            </span>
          )}
        </div>

        {/* Player Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${getPlayerGradient()}`}
              style={{ width: `${playerPercent}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {serverBots > 0 && `+${serverBots} bot`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoJoin}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              title={t.autoJoinButton}
              aria-label={t.autoJoinButton}
            >
              <Icons.AutoJoin />
            </button>
            {hasAlternates && (
              <>
                <button
                  ref={multiServerBtnRef}
                  onClick={handleMultiServerClick}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  title={t.multiServerSelect}
                >
                  {t.multiServerSelect}({(alternates?.length ?? 0) + 1})
                </button>
                {showMultiServerDropdown && dropdownPos && createPortal(
                  <div
                    ref={multiServerRef}
                    className="fixed w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden"
                    style={{ top: dropdownPos.top, left: dropdownPos.left, transform: 'translateY(-100%)' }}
                  >
                    <div className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold">
                      {t.multiServerTitle}
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                    {/* Current/primary server */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{serverIp}:{serverPort}</span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                          {serverCountryCode && <span>{serverCountry || serverCountryCode}</span>}
                          <span>{serverPlayers}/{serverMaxPlayers}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setAutoJoinTarget(null); setShowAutoJoinModal(true); setShowMultiServerDropdown(false); }}
                          className="p-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded transition-colors"
                          title={t.autoJoinButton}
                        >
                          <Icons.AutoJoin />
                        </button>
                        <button
                          onClick={(e) => handleConnect(e)}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded transition-colors"
                        >
                          {t.multiServerJoin}
                        </button>
                      </div>
                    </div>
                    {/* Alternate servers */}
                    {alternates?.map((alt) => (
                      <div key={`${alt.ip}:${alt.port}`} className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{alt.ip}:{alt.port}</span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                            {alt.country_code && <span>{alt.country_name || alt.country_code}</span>}
                            <span>{alt.real_players}/{alt.max_players}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleAutoJoinAlternate(alt.ip, alt.port, e)}
                            className="p-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded transition-colors"
                            title={t.autoJoinButton}
                          >
                            <Icons.AutoJoin />
                          </button>
                          <button
                            onClick={(e) => handleConnectAlternate(alt.ip, alt.port, e)}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded transition-colors"
                          >
                            {t.multiServerJoin}
                          </button>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>,
                  document.body
                )}
              </>
            )}
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Icons.Play />
              {t.joinServer}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Join Modal */}
      {showAutoJoinModal && (
        <AutoJoinModal
          server={autoJoinTarget || server}
          onClose={() => { setShowAutoJoinModal(false); setAutoJoinTarget(null); }}
        />
      )}

      {/* Cloud Favorite Prompt */}
      {showCloudPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={(e) => { e.stopPropagation(); setShowCloudPrompt(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {showCloudPrompt === 'add' ? t.addToCloudPrompt : t.removeFromCloudPrompt}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              {showCloudPrompt === 'add' ? t.addToCloudPromptDesc : t.removeFromCloudPromptDesc}
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-4 truncate">{serverName}</p>
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCloudPrompt(null); }}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCloudPromptConfirm(); }}
                className={`flex-1 px-4 py-2 rounded-xl text-white font-medium transition-colors ${
                  showCloudPrompt === 'add' 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {showCloudPrompt === 'add' ? t.addToFavorites : t.removeFavorite}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
