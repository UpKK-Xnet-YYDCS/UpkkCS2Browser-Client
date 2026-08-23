import type { Player } from '@/types';
import { useI18n } from '@/hooks/useI18n';
import { getListedPlayerView, isListedPlayer } from '@/services/serverPresentation';
import { formatDuration } from '@/utils/serverDetailFormat';
import { RefreshIcon } from '../serverDetailIcons';

interface ServerDetailPlayerListProps {
  serverPlayers: number;
  players: Player[];
  loadingPlayers: boolean;
  isAuthenticated: boolean;
  onRefresh: () => void;
}

export function ServerDetailPlayerList({
  serverPlayers,
  players,
  loadingPlayers,
  isAuthenticated,
  onRefresh,
}: ServerDetailPlayerListProps) {
  const { t } = useI18n();
  if (serverPlayers <= 0) return null;

  return (
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
          onClick={onRefresh}
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
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span>{t.serverDetailOnlinePlayers}</span>
            <span className="w-16 text-center">{t.playerScore}</span>
            <span className="w-24 text-right">{t.playerDuration}</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
            {players.filter(isListedPlayer).map((player, index) => {
              const view = getListedPlayerView(player);
              const duration = view.durationLabel || formatDuration(view.durationSeconds);
              return (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {view.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {view.name}
                    </span>
                  </div>
                  <span className="w-16 text-center text-sm font-mono text-gray-600 dark:text-gray-300">
                    {view.score}
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
  );
}
