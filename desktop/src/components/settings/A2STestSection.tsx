import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { parseServerAddress, queryServerA2S, type A2SQueryResult } from '@/services/a2s';
import { useLatencyDetectionSettings } from '@/services/latencySettings';

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

export function A2STestSection() {
  const { t } = useI18n();
  const latencyDetectionSettings = useLatencyDetectionSettings();
  const [address, setAddress] = useState('');
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState<A2SQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parsedAddress = parseServerAddress(address);

  const handleQuery = async () => {
    if (!parsedAddress) return;
    setQuerying(true);
    setResult(null);
    setError(null);
    try {
      const nextResult = await queryServerA2S(parsedAddress.ip, parsedAddress.port, {
        timeoutMs: latencyDetectionSettings.a2sTimeoutMs,
      });
      if (!nextResult.success) {
        setError(nextResult.error || t.a2sTestError);
      } else {
        setResult(nextResult);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message || t.a2sTestError);
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <ServerIcon />
        {t.a2sTest}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t.a2sTestDesc}</p>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={address}
          onChange={event => setAddress(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleQuery();
            }
          }}
          placeholder={t.a2sTestPlaceholder}
          className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
        />
        <button
          onClick={handleQuery}
          disabled={querying || !parsedAddress}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {querying && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {querying ? t.a2sTestQuerying : t.a2sTestQuery}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
          <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">{t.a2sTestResult}</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-gray-500 dark:text-gray-400">{t.a2sServerName}</div>
            <div className="text-gray-900 dark:text-white font-medium truncate">{result.name}</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sMap}</div>
            <div className="text-gray-900 dark:text-white font-mono">{result.map_name}</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sPlayers}</div>
            <div className="text-gray-900 dark:text-white">{result.real_players}/{result.max_players} ({result.bots} bots)</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sGame}</div>
            <div className="text-gray-900 dark:text-white">{result.game}</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sServerType}</div>
            <div className="text-gray-900 dark:text-white">{result.server_type}</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sEnvironment}</div>
            <div className="text-gray-900 dark:text-white">{result.environment}</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sVac}</div>
            <div className={result.vac ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>{result.vac ? t.a2sYes : t.a2sNo}</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sPassword}</div>
            <div className={result.password ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}>{result.password ? t.a2sYes : t.a2sNo}</div>
            <div className="text-gray-500 dark:text-gray-400">{t.a2sVersion}</div>
            <div className="text-gray-900 dark:text-white font-mono text-xs">{result.version}</div>
          </div>
        </div>
      )}
    </div>
  );
}
