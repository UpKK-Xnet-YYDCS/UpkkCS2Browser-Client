import { useEffect, useState } from 'react';
import { getA2SDebug, type A2SLatencyStatPoint, type A2SQueryDebugRecord } from '@/api/history';
import { useI18n } from '@/hooks/useI18n';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { calculateStats, formatLatencyMs } from '@/services/queryRecordsStats';
import {
  paginateRecentRecords,
  queryRecordsLoadError,
  queryRecordsResponseError,
  querySummaryMaxLatencyClass,
  querySummarySuccessRateClass,
} from '@/services/queryRecordsPresentation';
import { QueryRecordsChart } from './QueryRecordsChart';
import { QueryRecordsRecentList } from './QueryRecordsRecentList';

interface QueryRecordsProps {
  serverAddress: string; // e.g. "1.2.3.4:27015"
}

export function QueryRecords({ serverAddress }: QueryRecordsProps) {
  const [records, setRecords] = useState<A2SQueryDebugRecord[]>([]);
  const [stats, setStats] = useState<A2SLatencyStatPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [recordsPage, setRecordsPage] = useState(1);
  const { t } = useI18n();
  const isDark = useIsDarkMode();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setRecordsPage(1);
      setExpandedRecord(null);
      try {
        const response = await getA2SDebug(serverAddress);
        if (!response.success) {
          setError(queryRecordsResponseError(response.error));
          return;
        }
        setRecords(response.records || []);
        setStats(response.stats || []);
      } catch (err) {
        setError(queryRecordsLoadError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [serverAddress]);

  const { safePage } = paginateRecentRecords(records, recordsPage);
  if (recordsPage !== safePage) {
    setRecordsPage(safePage);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500 text-sm">{error}</div>
    );
  }

  if (records.length === 0 && stats.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        {t.queryNoRecords}
      </div>
    );
  }

  const summary = stats.length > 0 ? calculateStats(stats) : null;
  const maxLatencyClass = summary ? querySummaryMaxLatencyClass(summary.maxLatency) : '';
  const successRateClass = summary ? querySummarySuccessRateClass(summary.successRate) : '';

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800/80">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{summary.totalQueries}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.queryTotalQueries}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800/80">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatLatencyMs(summary.avgLatency)}
              <span className="ml-0.5 text-xs">ms</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.queryAvgLatency}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800/80">
            <div className={maxLatencyClass}>
              {formatLatencyMs(summary.maxLatency)}
              <span className="ml-0.5 text-xs">ms</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.queryMaxLatency}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800/80">
            <div className={successRateClass}>
              {summary.successRate.toFixed(1)}
              <span className="ml-0.5 text-xs">%</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.querySuccessRate}</div>
          </div>
        </div>
      )}

      {stats.length > 0 && (
        <div>
          <div className="mb-2">
            <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">{t.queryLatencyChart}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.queryLatencyChartDesc}</div>
          </div>
          <QueryRecordsChart
            stats={stats}
            isDark={isDark}
            labels={{
              time: t.chartTooltipTime,
              avgLatency: t.queryAvgLatency,
              maxLatency: t.queryMaxLatency,
              successRate: t.querySuccessRate,
              failure: t.queryFailed,
              totalQueries: t.queryTotalQueries,
            }}
          />
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">{t.queryAvgLatency}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-gray-600 dark:text-gray-400">{t.queryMaxLatency}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="rounded bg-red-500" style={{ width: 2, height: 12 }} />
              <span className="text-gray-600 dark:text-gray-400">{t.queryFailed} 100%</span>
            </div>
          </div>
        </div>
      )}

      {records.length > 0 && (
        <QueryRecordsRecentList
          records={records}
          expandedRecord={expandedRecord}
          onToggleExpanded={(index) => setExpandedRecord(expandedRecord === index ? null : index)}
          page={safePage}
          onPageChange={setRecordsPage}
        />
      )}
    </div>
  );
}
