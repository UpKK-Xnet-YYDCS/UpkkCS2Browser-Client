import type { FavoriteServer } from '@/api/favorites';
import {
  buildRuleEditorServerEntries,
  filterRuleEditorServers,
  paginateRuleEditorServers,
} from '@/services/ruleEditorServers';
import type { Translations } from '@/store/i18n';

export interface RuleEditorServerPickerProps {
  t: Translations;
  selectedServers: string[];
  serverSearch: string;
  onSearchChange: (value: string) => void;
  loadingFavorites: boolean;
  favoriteServers: FavoriteServer[];
  localFavorites: string[];
  localServerNames: Record<string, string>;
  serverPage: number;
  onPageChange: (update: number | ((page: number) => number)) => void;
  onToggle: (serverKey: string) => void;
}

export function RuleEditorServerPicker(props: RuleEditorServerPickerProps) {
  const {
    t, selectedServers, serverSearch, onSearchChange, loadingFavorites,
    favoriteServers, localFavorites, localServerNames, serverPage, onPageChange, onToggle,
  } = props;
  const allEntries = buildRuleEditorServerEntries(favoriteServers, localFavorites, localServerNames);
  const filtered = filterRuleEditorServers(allEntries, serverSearch);
  const { pageItems: paginated, totalPages } = paginateRuleEditorServers(filtered, serverPage);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t.monitorSelectedServers}
      </label>
      <div className="mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t.monitorSelectFromFavorites}
            {selectedServers.length > 0 && (
              <span className="ml-2 text-blue-500 font-medium">
                ({selectedServers.length} {t.monitorSelectedCount})
              </span>
            )}
          </p>
          <div className="mb-2">
            <input
              type="text"
              value={serverSearch}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={t.monitorSearchServers}
              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          {loadingFavorites ? (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">
              {t.monitorLoadingFavorites}
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-gray-200 dark:border-gray-600">
              {filtered.length === 0 ? (
                <div className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">
                  {t.monitorNoFavoritesAvailable}
                </div>
              ) : (
                <>
                  {paginated.map(entry => {
                    const isSelected = selectedServers.includes(entry.key);
                    const rowClass = isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700';
                    const boxClass = isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-500';
                    return (
                      <button
                        key={entry.key}
                        onClick={() => onToggle(entry.key)}
                        className={"w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-700 " + rowClass}
                      >
                        <span className={"flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center " + boxClass}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{entry.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {entry.key}
                            {entry.source === 'local' && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px]">
                                {t.monitorLocalFavorites}
                              </span>
                            )}
                          </div>
                        </div>
                        {entry.map && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">🗺️ {entry.map}</span>
                        )}
                      </button>
                    );
                  })}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => onPageChange(p => Math.max(1, p - 1))}
                        disabled={serverPage <= 1}
                        className="px-2 py-1 text-xs rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {serverPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
                        disabled={serverPage >= totalPages}
                        className="px-2 py-1 text-xs rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

