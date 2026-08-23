import { setPrefetchDelay, setPrefetchPages } from '@/api/client';
import type { Translations } from '@/store/i18n';

export function PrefetchSettingsSection({
  t,
  prefetchPagesCount,
  setPrefetchPagesCount,
  prefetchDelayMs,
  setPrefetchDelayMs,
}: {
  t: Translations;
  prefetchPagesCount: number;
  setPrefetchPagesCount: (value: number) => void;
  prefetchDelayMs: number;
  setPrefetchDelayMs: (value: number) => void;
}) {
  return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t.prefetchPages}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.prefetchPagesDesc}
                    </label>
                    <select
                      value={prefetchPagesCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPrefetchPagesCount(val);
                        setPrefetchPages(val);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value={0}>{t.prefetchOff}</option>
                      <option value={1}>1{t.prefetchPagesOption}</option>
                      <option value={3}>3{t.prefetchPagesOption}</option>
                      <option value={5}>5{t.prefetchPagesOption}</option>
                      <option value={10}>10{t.prefetchPagesOption}</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t.prefetchPagesHint}
                    </p>
                  </div>
                  {prefetchPagesCount > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {t.prefetchEnabled} {prefetchPagesCount}{t.prefetchPagesOption}
                      </p>
                    </div>
                  )}
                  {prefetchPagesCount > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t.prefetchDelayDesc}
                      </label>
                      <select
                        value={prefetchDelayMs}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setPrefetchDelayMs(val);
                          setPrefetchDelay(val);
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        <option value={50}>50ms</option>
                        <option value={100}>100ms</option>
                        <option value={150}>150ms</option>
                        <option value={200}>200ms</option>
                        <option value={300}>300ms</option>
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t.prefetchDelayHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>
  );
}
