import { XMarkIcon } from '@/components/monitor/MonitorIcons';
import type { MonitoredServerDetails } from '@/hooks/useMonitorPage';
import type { Translations } from '@/store/i18n';

export interface MonitorMonitoredServersProps {
  t: Translations;
  allMonitoredServers: string[];
  monitoredServerInfo: Map<string, MonitoredServerDetails>;
  removeServerFromAllRules: (serverKey: string) => void;
}

export function MonitorMonitoredServers({
  t,
  allMonitoredServers,
  monitoredServerInfo,
  removeServerFromAllRules,
}: MonitorMonitoredServersProps) {
  if (allMonitoredServers.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
        </svg>
        {t.monitorMonitoredServers}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({allMonitoredServers.length})</span>
      </h2>
      <div className="space-y-2">
        {allMonitoredServers.map(serverKey => {
          const info = monitoredServerInfo.get(serverKey);
          return (
            <div key={serverKey} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {info ? info.name : serverKey}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="font-mono">{serverKey}</span>
                  {info && (
                    <>
                      <span>•</span>
                      <span>🗺️ {info.map}</span>
                      <span>•</span>
                      <span>👥 {info.players}/{info.maxPlayers}</span>
                      <span>•</span>
                      <span>🕐 {info.updatedAt}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeServerFromAllRules(serverKey)}
                title={t.monitorRemoveServer}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0 ml-2"
              >
                <XMarkIcon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
