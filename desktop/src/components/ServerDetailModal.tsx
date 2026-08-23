import type { ServerStatus } from '@/types';
import { useServerDetailModal } from '@/hooks/useServerDetailModal';
import { AutoJoinIcon, CloseIcon, CopyIcon, LatencyProbeIcon, PlayIcon } from './serverDetailIcons';
import { ServerDetailHistorySections } from './serverDetail/ServerDetailHistorySections';
import { ServerDetailInfoSection } from './serverDetail/ServerDetailInfoSection';
import { ServerDetailOfflineBanner } from './serverDetail/ServerDetailOfflineBanner';
import { ServerDetailPlayerList } from './serverDetail/ServerDetailPlayerList';
import { ServerActionModals } from './ServerActionModals';

interface ServerDetailModalProps {
  server: ServerStatus;
  onClose: () => void;
  /** Whether this server is a cloud favorite (enables remove button in header) */
  isCloudFavorite?: boolean;
  /** Callback after cloud favorite is removed */
  onFavoriteRemoved?: () => void;
}

export function ServerDetailModal({ server, onClose, isCloudFavorite, onFavoriteRemoved }: ServerDetailModalProps) {
  const page = useServerDetailModal({ server, isCloudFavorite, onFavoriteRemoved, onClose });
  const {
    t, players, loadingPlayers, isAuthenticated, copied,
    showAutoJoinModal, showJoinConfirm, showLatencyProbeModal,
    setShowAutoJoinModal, setShowLatencyProbeModal,
    openJoinConfirm, closeAutoJoin, closeJoinConfirm, closeLatency,
    showRemoveConfirm, setShowRemoveConfirm, removing, cloudFavState, cloudFavLoading,
    displayAddress, serverName, serverMap, serverPlayers, serverMaxPlayers, serverBots,
    serverCountry, serverVac, serverGame, serverCategory, serverVersion, serverOnline,
    offlineDuration, lastResponseText, historyServerId, historyAddress, playerPercent,
    fetchPlayers, handleCopyAddress, handleCloudFavoriteToggle, handleCloudRemove,
  } = page;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!serverOnline && (
            <ServerDetailOfflineBanner
              offlineDuration={offlineDuration}
              lastResponseText={lastResponseText}
            />
          )}

          <ServerDetailInfoSection
            serverMap={serverMap}
            serverPlayers={serverPlayers}
            serverMaxPlayers={serverMaxPlayers}
            serverBots={serverBots}
            serverGame={serverGame}
            serverCategory={serverCategory}
            serverCountry={serverCountry}
            serverVersion={serverVersion}
            serverVac={serverVac}
            password={server.password}
            playerPercent={playerPercent}
          />

          <ServerDetailPlayerList
            serverPlayers={serverPlayers}
            players={players}
            loadingPlayers={loadingPlayers}
            isAuthenticated={isAuthenticated}
            onRefresh={fetchPlayers}
          />

          <ServerDetailHistorySections
            serverId={historyServerId || undefined}
            serverAddress={historyAddress || undefined}
          />

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
                  className={'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ' + (cloudFavState
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50') + ' disabled:opacity-50'}
                >
                  {cloudFavLoading ? '...' : cloudFavState ? t.removeFavorite : t.addToFavorites}
                </button>
              </div>
            </div>
          )}

          {server.comments && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.serverDetailNotes}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{server.comments}</div>
            </div>
          )}
        </div>

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
            onClick={() => openJoinConfirm()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <PlayIcon />
            {t.joinServer}
          </button>
          <button
            onClick={handleCopyAddress}
            className={'px-4 py-3 rounded-xl transition-all ' + (copied
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
            title={t.copyAddress}
          >
            <CopyIcon />
          </button>
        </div>
      </div>

      <ServerActionModals
        server={server}
        showAutoJoinModal={showAutoJoinModal}
        showLatencyProbeModal={showLatencyProbeModal}
        showJoinConfirm={showJoinConfirm}
        onCloseAutoJoin={closeAutoJoin}
        onCloseLatency={closeLatency}
        onCloseJoin={closeJoinConfirm}
      />

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
