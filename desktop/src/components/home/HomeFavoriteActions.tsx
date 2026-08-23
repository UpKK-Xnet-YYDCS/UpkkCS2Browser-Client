import { PlusIcon } from '@/components/home/HomeControls';
import type { Translations } from '@/store/i18n';
import type { ServerStatus } from '@/types';
import { isServerOnline } from '@/utils/serverStatus';

export interface HomeFavoriteActionsProps {
  t: Translations;
  showOfflineServers: boolean;
  setShowOfflineServers: (value: boolean | ((prev: boolean) => boolean)) => void;
  favServers: ServerStatus[];
  handleClearOffline: () => void;
  onAddLocalServer: () => void;
  handleExportFavorites: () => void;
  handleImportFavorites: () => void;
  favoriteCount: number;
}

export function HomeFavoriteActions({
  t,
  showOfflineServers,
  setShowOfflineServers,
  favServers,
  handleClearOffline,
  onAddLocalServer,
  handleExportFavorites,
  handleImportFavorites,
  favoriteCount,
}: HomeFavoriteActionsProps) {
  return (
    <>
      <button
        onClick={() => setShowOfflineServers(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          showOfflineServers
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        title={t.showOfflineServers}
      >
        <span className={`w-2 h-2 rounded-full ${showOfflineServers ? 'bg-red-500' : 'bg-gray-400'}`} />
        <span>{t.showOfflineServers}</span>
      </button>
      {showOfflineServers && favServers.some(s => !isServerOnline(s)) && (
        <button
          onClick={handleClearOffline}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-all"
          title={t.clearOfflineServers}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          <span>{t.clearOfflineServers}</span>
        </button>
      )}
      <button
        onClick={() => onAddLocalServer()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all shadow-md hover:shadow-lg"
        title={t.addLocalServer}
      >
        <PlusIcon />
        <span>{t.addLocalServer}</span>
      </button>
      <button
        onClick={handleExportFavorites}
        disabled={favoriteCount === 0}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-all"
        title={t.exportFavorites}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        <span>{t.exportFavorites}</span>
      </button>
      <button
        onClick={handleImportFavorites}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
        title={t.importFavorites}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        <span>{t.importFavorites}</span>
      </button>
    </>
  );
}
