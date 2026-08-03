import type { Ref } from 'react';
import type { Translations } from '@/store/i18n';
import { clearLogs, type LogEntry } from '@/store/log';
import { LogIcon, TrashIcon } from './SettingsIcons';

const formatLogTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const levelColor: Record<string, string> = {
  info: 'text-blue-600 dark:text-blue-400',
  warn: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  debug: 'text-gray-500 dark:text-gray-400',
};

const levelBg: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20',
  warn: 'bg-yellow-50 dark:bg-yellow-900/20',
  error: 'bg-red-50 dark:bg-red-900/20',
  debug: 'bg-gray-50 dark:bg-gray-800/40',
};

interface OperationLogPanelProps {
  entries: readonly LogEntry[];
  endRef: Ref<HTMLDivElement>;
  t: Translations;
}

export function OperationLogPanel({ entries, endRef, t }: OperationLogPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LogIcon />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{t.operationLog}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.operationLogDesc}</p>
          </div>
        </div>
        {entries.length > 0 && (
          <button
            onClick={clearLogs}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            <TrashIcon />
          </button>
        )}
      </div>
      <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <LogIcon />
            <p className="mt-2 text-sm">{t.logEmpty}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {entries.map(entry => (
              <div
                key={entry.id}
                className={`flex items-start gap-3 px-4 py-2.5 text-sm ${levelBg[entry.level] || ''}`}
              >
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 font-mono pt-0.5">
                  {formatLogTime(entry.timestamp)}
                </span>
                <span className={`shrink-0 text-xs font-semibold uppercase pt-0.5 ${levelColor[entry.level] || ''}`}>
                  {entry.level}
                </span>
                <span className="shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5">
                  {entry.tag}
                </span>
                <span className="text-gray-800 dark:text-gray-200 break-all font-mono text-xs leading-relaxed">
                  {entry.message}
                </span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}

