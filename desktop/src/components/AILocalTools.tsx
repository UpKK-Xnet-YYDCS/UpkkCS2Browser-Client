import { Play, X } from 'lucide-react';
import type { Language } from '@/store/i18n';
import type { LocalLatencyResult } from '@/services/desktopTools';
import { recommendedServerToStatus } from '@/services/desktopTools';
import type { ServerStatus } from '@/types';

interface AILocalToolsProps {
  language: Language;
  running: boolean;
  results: LocalLatencyResult[];
  onJoin: (server: ServerStatus, latencyMs?: number) => void;
  onClear: () => void;
}

const labels = {
  en: { result: 'Local A2S results', unavailable: 'No usable local RTT', join: 'Join server', clear: 'Clear results' },
  ja: { result: 'ローカルA2S結果', unavailable: '利用可能なローカルRTTなし', join: 'サーバーに接続', clear: '結果を消去' },
  'zh-CN': { result: '本地 A2S 测试结果', unavailable: '没有可用的本地延迟结果', join: '加入服务器', clear: '清除结果' },
  'zh-TW': { result: '本機 A2S 測試結果', unavailable: '沒有可用的本機延遲結果', join: '加入伺服器', clear: '清除結果' },
  ko: { result: '로컬 A2S 결과', unavailable: '사용 가능한 로컬 RTT 없음', join: '서버 접속', clear: '결과 지우기' },
} as const;

export function AILocalTools({ language, running, results, onJoin, onClear }: AILocalToolsProps) {
  const text = labels[language];
  const successful = results.filter(result => result.success).slice(0, 3);
  if (!running && results.length === 0) return null;

  return (
    <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
      {running && <div className="mb-2 flex items-center gap-2 text-xs text-gray-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />{text.result}</div>}

      {results.length > 0 && (
        <div className="mt-2 rounded-md bg-gray-50 p-2 dark:bg-gray-900/70">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{text.result}</span>
            <button type="button" onClick={onClear} title={text.clear} aria-label={text.clear} className="grid h-6 w-6 place-items-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"><X className="h-3.5 w-3.5" /></button>
          </div>
          {successful.length === 0 ? <p className="text-xs text-gray-500">{text.unavailable}</p> : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {successful.map(result => (
                <div key={`${result.server.ip}:${result.server.port}`} className="flex min-w-0 items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800 dark:text-gray-100">{result.server.name || `${result.server.ip}:${result.server.port}`}</span>
                  <strong className="shrink-0 text-xs tabular-nums text-emerald-700 dark:text-emerald-400">{result.latencyMs} ms</strong>
                  <button type="button" onClick={() => onJoin(recommendedServerToStatus(result.server, result.latencyMs), result.latencyMs)} title={text.join} aria-label={text.join} className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-blue-600 text-white hover:bg-blue-700"><Play className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
