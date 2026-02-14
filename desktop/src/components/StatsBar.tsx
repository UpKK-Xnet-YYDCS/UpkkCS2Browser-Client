import { useAppStore } from '@/store';
import { useI18n } from '@/store/i18n';

const ServerIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
  </svg>
);

export function StatsBar() {
  const { stats, totalServers, isLoading } = useAppStore();
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800/50">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50" />
        <ServerIcon />
        <span className="text-sm font-medium text-green-700 dark:text-green-400">
          {isLoading ? '...' : totalServers}
        </span>
        <span className="text-xs text-green-600 dark:text-green-500">{t.totalServers}</span>
      </div>
      {stats && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
          <span className="w-2 h-2 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50" />
          <UsersIcon />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
            {stats.total_players || 0}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-500">{t.online}</span>
        </div>
      )}
    </div>
  );
}
