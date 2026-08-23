import { CheckCircleIcon } from '@/components/monitor/MonitorIcons';
import type { MatchedServer } from '@/services/monitor';
import type { Translations } from '@/store/i18n';

export interface MonitorMatchedServersProps {
  t: Translations;
  currentMatches: MatchedServer[];
  recentMatches: MatchedServer[];
  onJoin: (match: MatchedServer) => void;
}

function formatMatchTime(isoStr: string | null) {
  if (!isoStr) return '--';
  return new Date(isoStr).toLocaleTimeString();
}

export function MonitorMatchedServers({
  t, currentMatches, recentMatches, onJoin,
}: MonitorMatchedServersProps) {
  return (
    <>
        {/* Active Matched Servers — real-time matches, independent of notification cooldown */}
        {(() => {
          // Deduplicate: keep only the latest match per serverKey
          const latestByServer = new Map<string, MatchedServer>();
          for (const m of currentMatches) {
            if (!latestByServer.has(m.serverKey)) {
              latestByServer.set(m.serverKey, m);
            }
          }
          const activeServers = Array.from(latestByServer.values());
          return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                {t.monitorActiveMatches}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({activeServers.length})</span>
              </h2>
              {activeServers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                  {t.monitorNoActiveMatches}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeServers.map(match => (
                    <div key={match.serverKey} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{match.serverName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                          <span className="font-mono">{match.serverKey}</span>
                          <span>•</span>
                          <span>🗺️ {match.mapName}</span>
                          <span>•</span>
                          <span>👥 {match.players}/{match.maxPlayers}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onJoin(match)}
                        className="flex-shrink-0 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                      >
                        ▶ {t.monitorJoinServer}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Recent Matches — notification history */}
        {recentMatches.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
              <CheckCircleIcon />
              {t.monitorRecentMatches}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({recentMatches.length})</span>
            </h2>
            <div className="space-y-2">
              {recentMatches.map((match, i) => (
                <div key={`${match.serverKey}-${match.matchedAt}-${i}`} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{match.serverName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{match.serverKey}</span>
                      <span>•</span>
                      <span>🗺️ {match.mapName}</span>
                      <span>•</span>
                      <span>👥 {match.players}/{match.maxPlayers}</span>
                      <span>•</span>
                      <span>📋 {match.matchedRule}</span>
                      <span>•</span>
                      <span>🕐 {formatMatchTime(match.matchedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

    </>
  );
}
