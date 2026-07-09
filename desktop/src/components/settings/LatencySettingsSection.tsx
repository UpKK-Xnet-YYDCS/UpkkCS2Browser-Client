import { useI18n } from '@/hooks/useI18n';
import {
  setLatencyA2STimeoutMs,
  setLatencyDeepScanEnabled,
  setLatencyRetryCount,
  setLatencyRetryDelayMs,
  setLatencyWorkerCount,
  useLatencyDetectionSettings,
} from '@/services/latencySettings';

const LatencyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16M7 15l3-4 3 2 4-7" />
  </svg>
);

export function LatencySettingsSection() {
  const { t } = useI18n();
  const settings = useLatencyDetectionSettings();

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <LatencyIcon />
        {t.latencySettings}
      </h3>
      <div className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white">{t.latencyDeepScan}</p>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{t.latencyDeepScanDesc}</p>
          </div>
          <button
            type="button"
            onClick={() => setLatencyDeepScanEnabled(!settings.deepScanEnabled)}
            className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors ${
              settings.deepScanEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-pressed={settings.deepScanEnabled}
            aria-label={t.latencyDeepScan}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              settings.deepScanEnabled ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t.latencyWorkerCount}</span>
            <span className="mt-1 block min-h-10 text-xs leading-5 text-gray-500 dark:text-gray-400">{t.latencyWorkerCountDesc}</span>
            <input
              type="number"
              min="1"
              max="6"
              step="1"
              value={settings.workerCount}
              onChange={event => setLatencyWorkerCount(Number(event.target.value))}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t.latencyA2STimeout}</span>
            <span className="mt-1 block min-h-10 text-xs leading-5 text-gray-500 dark:text-gray-400">{t.latencyA2STimeoutDesc}</span>
            <input
              type="number"
              min="500"
              max="5000"
              step="100"
              value={settings.a2sTimeoutMs}
              onChange={event => setLatencyA2STimeoutMs(Number(event.target.value))}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t.latencyRetryCount}</span>
            <span className="mt-1 block min-h-10 text-xs leading-5 text-gray-500 dark:text-gray-400">{t.latencyRetryCountDesc}</span>
            <input
              type="number"
              min="0"
              max="5"
              step="1"
              value={settings.retryCount}
              onChange={event => setLatencyRetryCount(Number(event.target.value))}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
            <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t.latencyRetryDelay}</span>
            <span className="mt-1 block min-h-10 text-xs leading-5 text-gray-500 dark:text-gray-400">{t.latencyRetryDelayDesc}</span>
            <input
              type="number"
              min="0"
              max="3000"
              step="50"
              value={settings.retryDelayMs}
              onChange={event => setLatencyRetryDelayMs(Number(event.target.value))}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
