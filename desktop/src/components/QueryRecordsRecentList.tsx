import type { A2SQueryDebugRecord } from '@/api/history';
import { useI18n } from '@/hooks/useI18n';
import { formatLatencyMs, formatQueryNodeLabel } from '@/services/queryRecordsStats';
import {
  paginateRecentRecords,
  queryRecordDurationClass,
  queryRecordGlobalIndex,
  queryRecordNodeClass,
  queryRecordRowClass,
  queryRecordStatusClass,
} from '@/services/queryRecordsPresentation';

interface QueryRecordsRecentListProps {
  records: A2SQueryDebugRecord[];
  expandedRecord: number | null;
  onToggleExpanded: (index: number) => void;
  page: number;
  onPageChange: (updater: (page: number) => number) => void;
}

export function QueryRecordsRecentList({
  records,
  expandedRecord,
  onToggleExpanded,
  page,
  onPageChange,
}: QueryRecordsRecentListProps) {
  const { t } = useI18n();
  const { totalPages, safePage, items } = paginateRecentRecords(records, page);

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t.queryRecentRecords}</div>
      <div className="space-y-2">
        {items.map((record, pageIndex) => {
          const index = queryRecordGlobalIndex(safePage, pageIndex);
          const time = new Date(record.timestamp * 1000).toLocaleString();
          const isExpanded = expandedRecord === index;
          const rowClass = queryRecordRowClass(record.success);
          const statusClass = queryRecordStatusClass(record.success);
          const durationClass = queryRecordDurationClass(record.success, record.duration_ms);
          const nodeClass = queryRecordNodeClass(record.is_from_node);

          return (
            <div key={index} className={rowClass}>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-mono text-gray-500 dark:text-gray-400">#{index + 1}</span>
                <span className={statusClass}>
                  {record.success ? t.querySuccess : t.queryFailed}
                </span>
                {record.duration_ms > 0 && (
                  <span className={durationClass}>
                    {formatLatencyMs(record.duration_ms)}ms
                  </span>
                )}
                <span className={nodeClass}>
                  {formatQueryNodeLabel(record.is_from_node, record.node_name, t.queryLocalNode, t.queryRemoteNode)}
                </span>
                <span className="ml-auto text-gray-400 dark:text-gray-500">{time}</span>
              </div>
              {record.error_message && (
                <div className="mt-1.5 text-xs text-red-600 dark:text-red-300">{t.queryError}: {record.error_message}</div>
              )}
              {record.a2s_data && Object.keys(record.a2s_data).length > 0 && (
                <details open={isExpanded} onToggle={() => onToggleExpanded(index)}>
                  <summary className="mt-1.5 cursor-pointer text-xs text-blue-600 hover:underline dark:text-blue-400">
                    {t.queryA2SData} ({t.queryClickToExpand})
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-x-auto rounded bg-gray-100 p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {JSON.stringify(record.a2s_data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
          >
            {t.prevPage}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
          >
            {t.nextPage}
          </button>
        </div>
      )}
    </div>
  );
}
