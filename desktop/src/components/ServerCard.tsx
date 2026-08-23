import type { ServerStatus } from '@/types';
import { useState, memo } from 'react';
import { LocalA2SLatencyBadge } from './LocalA2SLatencyBadge';
import { useI18n } from '@/hooks/useI18n';
import { getOfflineDuration, isServerOnline } from '@/utils/serverStatus';
import { Icons } from './serverCardPresentation';
import { DEFAULT_MAP_IMAGE, getMapImageUrl } from '@/services/serverCardImages';
import { getPlayerLoadGradient, getPlayerLoadPercent, resolveServerPresentation } from '@/services/serverPresentation';
import { useMultiServerDropdown } from '@/hooks/useMultiServerDropdown';
import { useServerJoinActions } from '@/hooks/useServerJoinActions';
import { useServerCloudFavorite } from '@/hooks/useServerCloudFavorite';
import { ServerJoinControls } from './server/ServerJoinControls';
import { ServerCloudFavoritePrompt } from './ServerCloudFavoritePrompt';

interface ServerCardProps {
  server: ServerStatus;
  onClick?: () => void;
  onSelect?: (server: ServerStatus) => void;
  onFavoriteChange?: () => void;
  hideCloudFavorite?: boolean;
}

function ServerCardInner({ server, onClick, onSelect, onFavoriteChange, hideCloudFavorite }: ServerCardProps) {
  const { t } = useI18n();
  const [imageError, setImageError] = useState(false);
  const dropdown = useMultiServerDropdown('up');
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
  const offlineDuration = serverOnline ? '' : getOfflineDuration(server, {
    secondsAgo: t.secondsAgo,
    minutesAgo: t.minutesAgo,
    hoursAgo: t.hoursAgo,
    minuteUnit: t.minuteUnit,
    hourUnit: t.hourUnit,
    dayUnit: t.dayUnit,
  });
  // Favorite state: use only local favorites to avoid per-card API calls.
  // Cloud favorite status is checked lazily when user clicks the favorite button.
  // Use baseAddress (from display_address) to keep domain names consistent
  const {
    isLoggedIn,
    favorite,
    isFavoriteLoading,
    showCloudPrompt,
    setShowCloudPrompt,
    handleFavoriteClick,
    handleCloudPromptConfirm,
  } = useServerCloudFavorite({
    favoriteAddr: displayAddress,
    serverIp,
    serverPort,
    serverName,
    onFavoriteChange,
  });
  const playerPercent = getPlayerLoadPercent(serverPlayers, serverMaxPlayers);

  const handleImageError = () => {
    setImageError(true);
  };

  // Get map image URL from API or construct it
  const mapImageUrl = getMapImageUrl(serverMap, server.map_image_url);

  return (
    <div 
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 hover:scale-[1.02]"
      onClick={onSelect ? () => onSelect(server) : onClick}
    >
      {/* Map Preview Banner - using real map image like web template */}
      <div className="h-32 relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        <img 
          src={imageError ? DEFAULT_MAP_IMAGE : mapImageUrl}
          alt={serverMap}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {!serverOnline && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-slate-950/70 text-white backdrop-blur-[1px] pointer-events-none">
            <Icons.WifiOff />
            <strong className="text-sm font-black tracking-wide">{t.offline}</strong>
            {offlineDuration && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90">
                <Icons.Clock />
                {t.serverOfflineDuration}: {offlineDuration}
              </span>
            )}
          </div>
        )}
        
        {/* Map name on image */}
        <div className="absolute bottom-2 left-2 right-16 z-20">
          <span className="text-white text-sm font-bold truncate block drop-shadow-lg">
            {serverMap}
          </span>
        </div>
        
        {/* Player count overlay */}
        <div className="absolute bottom-2 right-2 z-20 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg flex items-center gap-1.5">
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
          className={`absolute top-2 right-2 z-20 p-1.5 rounded-lg backdrop-blur-sm transition-all duration-200 ${
            isFavoriteLoading
              ? 'text-gray-400 bg-black/40'
              : favorite 
                ? 'text-yellow-400 bg-black/40 scale-110' 
                : 'text-white/70 bg-black/30 hover:text-yellow-400 hover:bg-black/50 hover:scale-110'
          }`}
          title={isLoggedIn ? (favorite ? t.removeFromCloudFavorites : t.addToCloudFavorites) : (favorite ? t.removeFromLocalFavorites : t.addToLocalFavorites)}
        >
          {isFavoriteLoading ? <Icons.Loading /> : <Icons.Star filled={favorite} />}
        </button>
        )}
        
        {/* Local latency indicator */}
        <div className="absolute top-2 left-2 z-20">
          <LocalA2SLatencyBadge
            compact
            overlay
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
              className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${getPlayerLoadGradient(playerPercent)}`}
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
            <ServerJoinControls
              server={server}
              variant="card"
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
      </div>

      {showCloudPrompt && (
        <ServerCloudFavoritePrompt
          action={showCloudPrompt}
          serverName={serverName}
          onCancel={() => setShowCloudPrompt(null)}
          onConfirm={handleCloudPromptConfirm}
        />
      )}
    </div>
  );
}

export const ServerCard = memo(ServerCardInner);
