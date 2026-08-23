import { memo } from 'react';
import type { ServerStatus } from '@/types';
import { useFavoriteActions, useIsFavorite } from '@/hooks/useFavoriteAddress';
import { useI18n } from '@/hooks/useI18n';
import { LocalA2SLatencyBadge } from './LocalA2SLatencyBadge';
import { isServerOnline } from '@/utils/serverStatus';
import { useMultiServerDropdown } from '@/hooks/useMultiServerDropdown';
import { useServerJoinActions } from '@/hooks/useServerJoinActions';
import { ServerJoinControls } from './server/ServerJoinControls';
import { getPlayerLoadPercent, getPlayerLoadTextClass, resolveServerPresentation } from '@/services/serverPresentation';
import { Icons } from './serverCardPresentation';

interface ServerListItemProps {
  server: ServerStatus;
  onClick?: () => void;
  onSelect?: (server: ServerStatus) => void;
}

function ServerListItemInner({ server, onClick, onSelect }: ServerListItemProps) {
  const { addFavorite, removeFavorite } = useFavoriteActions();
  const { t } = useI18n();
  const dropdown = useMultiServerDropdown('down');
  const join = useServerJoinActions(server, dropdown.close);

  const {
    serverIp,
    serverPort,
    displayAddress,
    serverName,
    serverMap,
    serverPlayers,
    serverMaxPlayers,
    serverBots,
    serverCountry,
    serverCountryCode,
    serverVac,
  } = resolveServerPresentation(server);
  const serverOnline = isServerOnline(server);
  // Use baseAddress (from display_address) to keep domain names consistent in favorites
  const favoriteAddr = displayAddress;
  const favorite = useIsFavorite(favoriteAddr);
  const playerPercent = getPlayerLoadPercent(serverPlayers, serverMaxPlayers);
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const addr = favoriteAddr;
    if (favorite) {
      removeFavorite(addr);
    } else {
      addFavorite(addr);
    }
  };

  return (
    <div 
      className="group flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={onSelect ? () => onSelect(server) : onClick}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <span
          className={`w-3 h-3 rounded-full block ${serverOnline ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.16)]'}`}
          title={serverOnline ? t.online : t.offline}
        />
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
        <Icons.Users className="w-4 h-4" />
        <span className={`text-sm font-medium ${getPlayerLoadTextClass(playerPercent)}`}>
          {serverPlayers}/{serverMaxPlayers}
        </span>
        {serverBots > 0 && (
          <span className="text-xs text-gray-400">(+{serverBots})</span>
        )}
      </div>

      {/* Local latency */}
      <div className="flex min-w-[70px]">
        <LocalA2SLatencyBadge
          compact
          status={server.local_latency_status}
          latencyMs={server.local_latency_ms}
          error={server.local_latency_error}
          onClick={join.handleLatencyClick}
          labels={{
            latency: t.localA2SLatency,
            queued: t.localA2SQueued,
            checking: t.localA2SChecking,
            unavailable: t.localA2SUnavailable,
            failed: t.localA2SFailed,
          }}
        />
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
        <ServerJoinControls
          server={server}
          variant="list"
          serverIp={serverIp}
          serverPort={serverPort}
          serverCountry={serverCountry}
          serverCountryCode={serverCountryCode}
          serverPlayers={serverPlayers}
          serverMaxPlayers={serverMaxPlayers}
          dropdown={dropdown}
          join={join}
        />
      </div>
    </div>
  );
}

export const ServerListItem = memo(ServerListItemInner);
