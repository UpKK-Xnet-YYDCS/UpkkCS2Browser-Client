import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ServerStatus } from '@/types';
import { useAppStore } from '@/store';
import { useI18n } from '@/store/i18n';
import { buildJoinUrl } from './SteamClientSwitch';
import { AutoJoinModal } from './AutoJoinModal';

// Simple inline SVG icons
const Icons = {
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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

interface ServerListItemProps {
  server: ServerStatus;
  onClick?: () => void;
}

export function ServerListItem({ server, onClick }: ServerListItemProps) {
  const { isFavorite, addFavorite, removeFavorite } = useAppStore();
  const { t } = useI18n();
  const [showAutoJoinModal, setShowAutoJoinModal] = useState(false);
  const [autoJoinTarget, setAutoJoinTarget] = useState<ServerStatus | null>(null);
  const [showMultiServerDropdown, setShowMultiServerDropdown] = useState(false);
  const multiServerRef = useRef<HTMLDivElement>(null);
  const multiServerBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  
  const alternates = server.alternate_servers;
  const hasAlternates = alternates && alternates.length > 0;

  // Close dropdown when clicking outside
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
  // If display_address exists (IP/domain without port), append port; otherwise fallback to ip:port
  // Strip any trailing port from display_address to avoid duplication (e.g. "1.1.1.1:29667:29667")
  const rawBaseAddress = server.display_address || serverIp;
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  const displayAddress = serverPort ? `${baseAddress}:${serverPort}` : baseAddress;
  
  // Use baseAddress (from display_address) to keep domain names consistent in favorites
  const favoriteAddr = serverPort ? `${baseAddress}:${serverPort}` : baseAddress;
  const favorite = isFavorite(favoriteAddr);
  
  const playerPercent = serverMaxPlayers > 0 
    ? Math.round((serverPlayers / serverMaxPlayers) * 100) 
    : 0;
  
  const getPlayerColor = () => {
    if (playerPercent >= 80) return 'text-green-600 dark:text-green-400';
    if (playerPercent >= 50) return 'text-yellow-600 dark:text-yellow-400';
    if (playerPercent > 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const handleAutoJoinClick = (e: React.MouseEvent) => {
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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const addr = favoriteAddr;
    if (favorite) {
      removeFavorite(addr);
    } else {
      addFavorite(addr);
    }
  };

  const handleConnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 使用 buildJoinUrl 函数获取正确的协议（steam:// 或 steamchina://）
    const steamUrl = buildJoinUrl(serverIp, serverPort, server.game_id ?? server.GameID, server.game);
    window.open(steamUrl, '_blank');
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
      setDropdownPos({ top: rect.bottom + 4, left });
    }
    setShowMultiServerDropdown(prev => !prev);
  };

  return (
    <div 
      className="group flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <span className={`w-3 h-3 rounded-full block ${serverOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* Server name and address */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium truncate text-sm ${serverOnline ? 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {serverOnline ? serverName : `[${t.offline}] - ${displayAddress}`}
          </h3>
          {serverVac && serverOnline && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded font-bold flex-shrink-0">
              VAC
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
          {displayAddress}
        </p>
      </div>

      {/* Map */}
      <div className="hidden sm:flex items-center gap-1.5 min-w-[120px]">
        <Icons.MapPin />
        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{serverMap}</span>
      </div>

      {/* Country */}
      {serverCountryCode && (
        <div className="hidden md:block min-w-[80px]">
          <span className="text-sm text-gray-600 dark:text-gray-300">{serverCountry || serverCountryCode}</span>
        </div>
      )}

      {/* Players */}
      <div className="flex items-center gap-1.5 min-w-[80px]">
        <Icons.Users />
        <span className={`text-sm font-medium ${getPlayerColor()}`}>
          {serverPlayers}/{serverMaxPlayers}
        </span>
        {serverBots > 0 && (
          <span className="text-xs text-gray-400">(+{serverBots})</span>
        )}
      </div>

      {/* Game */}
      {server.game && (
        <div className="hidden lg:block min-w-[100px]">
          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 rounded">
            {server.game}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleFavoriteClick}
          className={`p-1.5 rounded-lg transition-all duration-200 ${
            favorite 
              ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' 
              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
          }`}
        >
          <Icons.Star filled={favorite} />
        </button>
        <button
          onClick={handleAutoJoinClick}
          className="p-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white transition-all duration-200"
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
              className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-medium rounded-lg transition-all duration-200"
              title={t.multiServerSelect}
            >
              {t.multiServerSelect}({(alternates?.length ?? 0) + 1})
            </button>
            {showMultiServerDropdown && dropdownPos && createPortal(
              <div
                ref={multiServerRef}
                className="fixed w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden"
                style={{ top: dropdownPos.top, left: dropdownPos.left }}
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Icons.Play />
          {t.join}
        </button>
      </div>

      {/* Auto-Join Modal */}
      {showAutoJoinModal && (
        <AutoJoinModal
          server={autoJoinTarget || server}
          onClose={() => { setShowAutoJoinModal(false); setAutoJoinTarget(null); }}
        />
      )}
    </div>
  );
}
