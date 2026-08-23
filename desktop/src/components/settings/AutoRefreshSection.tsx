import { RefreshIcon } from '@/components/settings/SettingsIcons';
import {
  acceptCustomRefreshInput,
  intervalFromCustomRefreshInput,
  normalizeCustomRefreshBlur,
  resolveAutoRefreshSelection,
} from '@/services/autoRefreshPolicy';
import type { Translations } from '@/store/i18n';

export function AutoRefreshSection({
  t,
  autoRefreshInterval,
  setAutoRefreshInterval,
  showCustomInput,
  setShowCustomInput,
  customInputValue,
  setCustomInputValue,
  getAutoRefreshOptions,
}: {
  t: Translations;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (value: number) => void;
  showCustomInput: boolean;
  setShowCustomInput: (value: boolean) => void;
  customInputValue: string;
  setCustomInputValue: (value: string) => void;
  getAutoRefreshOptions: () => Array<{ value: number; label: string }>;
}) {
  return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <RefreshIcon />
                  {t.autoRefresh}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.refreshInterval}
                    </label>
                    <select
                      value={showCustomInput ? -1 : autoRefreshInterval}
                      onChange={(e) => {
                        const next = resolveAutoRefreshSelection(parseInt(e.target.value, 10), autoRefreshInterval);
                        setShowCustomInput(next.custom);
                        if (next.custom) {
                          setCustomInputValue(String(next.interval));
                        }
                        setAutoRefreshInterval(next.interval);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      {getAutoRefreshOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {showCustomInput && (
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="number"
                          min="10"
                          step="1"
                          value={customInputValue}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (acceptCustomRefreshInput(raw)) {
                              setCustomInputValue(raw);
                              const interval = intervalFromCustomRefreshInput(raw);
                              if (interval !== null) {
                                setAutoRefreshInterval(interval);
                              }
                            }
                          }}
                          onBlur={() => {
                            const next = normalizeCustomRefreshBlur(customInputValue);
                            setCustomInputValue(next.display);
                            setAutoRefreshInterval(next.interval);
                          }}
                          className="w-32 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          placeholder="60"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t.refreshCustomSeconds}</span>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {showCustomInput ? t.refreshCustomHint : t.refreshIntervalHint}
                    </p>
                  </div>
                  {autoRefreshInterval > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                        <RefreshIcon />
                        {t.autoRefreshEnabled} {showCustomInput ? `${autoRefreshInterval} ${t.refreshCustomSeconds}` : getAutoRefreshOptions().find(o => o.value === autoRefreshInterval)?.label}
                      </p>
                    </div>
                  )}
                </div>
              </div>
  );
}
