import { failureFlag } from './queryRecordsStats.ts';

export const LATENCY_WARNING_MS = 500;
export const SUCCESS_RATE_WARNING = 90;
export const RECENT_RECORDS_PAGE_SIZE = 3;

export function paginateRecentRecords<T>(records: readonly T[], page: number): {
  totalPages: number;
  safePage: number;
  items: T[];
  startIndex: number;
} {
  const totalPages = Math.max(1, Math.ceil(records.length / RECENT_RECORDS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * RECENT_RECORDS_PAGE_SIZE;
  return {
    totalPages,
    safePage,
    startIndex,
    items: records.slice(startIndex, safePage * RECENT_RECORDS_PAGE_SIZE) as T[],
  };
}

export function queryRecordGlobalIndex(safePage: number, pageIndex: number): number {
  return (safePage - 1) * RECENT_RECORDS_PAGE_SIZE + pageIndex;
}

export function queryRecordRowClass(success: boolean): string {
  return success
    ? 'rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/80'
    : 'rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40';
}

export function queryRecordStatusClass(success: boolean): string {
  return success
    ? 'rounded px-1.5 py-0.5 font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : 'rounded px-1.5 py-0.5 font-medium bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200';
}

export function queryRecordDurationClass(success: boolean, durationMs: number): string {
  return (!success || durationMs > LATENCY_WARNING_MS)
    ? 'rounded px-1.5 py-0.5 font-mono bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200'
    : 'rounded px-1.5 py-0.5 font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
}

export function queryRecordNodeClass(isFromNode: boolean): string {
  return isFromNode
    ? 'rounded px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    : 'rounded px-1.5 py-0.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

export function querySummaryMaxLatencyClass(maxLatency: number): string {
  return maxLatency > LATENCY_WARNING_MS
    ? 'text-lg font-bold text-red-500'
    : 'text-lg font-bold text-gray-900 dark:text-white';
}

export function querySummarySuccessRateClass(successRate: number): string {
  return successRate < SUCCESS_RATE_WARNING
    ? 'text-lg font-bold text-red-500'
    : 'text-lg font-bold text-green-600 dark:text-green-400';
}

export function queryRecordsResponseError(error?: string): string {
  return error || 'Unknown error';
}

export function queryRecordsLoadError(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to load';
}

export function queryRecordsHoverView(point: {
  query_count: number;
  success_count: number;
  max_latency: number;
}): {
  successRate: number;
  failed: boolean;
  maxLatency: number;
} {
  return {
    successRate: point.query_count > 0 ? (point.success_count / point.query_count) * 100 : 0,
    failed: failureFlag(point) === 100,
    maxLatency: point.success_count > 0 ? point.max_latency : 0,
  };
}
