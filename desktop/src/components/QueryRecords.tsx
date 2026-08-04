import { useState, useEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { getA2SDebug, type A2SQueryDebugRecord, type A2SLatencyStatPoint } from '@/api';
import { useI18n } from '@/hooks/useI18n';
import { useCanvasChart } from '@/hooks/useCanvasChart';

const LATENCY_WARNING_MS = 500;
const SUCCESS_RATE_WARNING = 90;
const RECENT_RECORDS_PAGE_SIZE = 3;

interface QueryRecordsProps {
  serverAddress: string; // e.g. "1.2.3.4:27015"
}

function formatQueryNodeLabel(isFromNode: boolean, nodeName: string, localLabel: string, remoteLabel: string): string {
  const normalized = (nodeName || '').trim();
  const isLocal = !isFromNode || normalized.toLowerCase() === 'local';
  if (isLocal) return localLabel;
  return remoteLabel + ': ' + (normalized || '-');
}

function formatLatencyMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0.0';
  return value.toFixed(1);
}

/** Failure is binary for charting: any failed sample in the bucket => 100%, else 0%. */
function failureFlag(point: Pick<A2SLatencyStatPoint, 'query_count' | 'success_count'>): 0 | 100 {
  if (point.query_count <= 0) return 0;
  return point.success_count < point.query_count ? 100 : 0;
}

function calculateStats(stats: A2SLatencyStatPoint[]) {
  let totalQueries = 0;
  let totalSuccess = 0;
  let totalLatency = 0;
  let maxLatency = 0;
  let latencyCount = 0;

  for (const s of stats) {
    totalQueries += s.query_count;
    totalSuccess += s.success_count;
    if (s.avg_latency > 0 && s.success_count > 0) {
      totalLatency += s.avg_latency * s.success_count;
      latencyCount += s.success_count;
    }
    if (s.success_count > 0 && s.max_latency > maxLatency) {
      maxLatency = s.max_latency;
    }
  }

  return {
    totalQueries,
    avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
    maxLatency,
    successRate: totalQueries > 0 ? (totalSuccess / totalQueries) * 100 : 0,
  };
}

interface LatencyChartProps {
  stats: A2SLatencyStatPoint[];
  labels: {
    time: string;
    avgLatency: string;
    maxLatency: string;
    successRate: string;
    failure: string;
    totalQueries: string;
  };
  isDark: boolean;
}

function LatencyChart({ stats, labels, isDark }: LatencyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ point: A2SLatencyStatPoint; left: number; tooltipLeft: number } | null>(null);

  const drawChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (stats.length === 0) return;

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const avgData = stats.map(s => s.avg_latency);
    const maxData = stats.map(s => (s.success_count > 0 ? s.max_latency : 0));
    const failData = stats.map(s => failureFlag(s));
    const maxValue = Math.max(...maxData, ...avgData, 1);

    const gridColor = isDark ? 'rgba(75, 85, 99, 0.55)' : '#e5e7eb';
    const axisText = isDark ? '#9ca3af' : '#6b7280';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      const value = Math.round(maxValue - (maxValue / gridLines) * i);
      ctx.fillStyle = axisText;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value + 'ms', padding.left - 5, y + 4);
    }

    const labelCount = Math.min(6, stats.length);
    const labelStep = Math.floor(stats.length / labelCount) || 1;
    ctx.fillStyle = axisText;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < stats.length; i += labelStep) {
      const x = padding.left + (chartWidth / (stats.length - 1 || 1)) * i;
      const date = new Date(stats[i].timestamp * 1000);
      ctx.fillText(date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }), x, height - 8);
    }

    const drawLatencyLine = (data: number[], color: string, fillColor: string) => {
      if (data.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const xStep = chartWidth / (data.length - 1 || 1);
      for (let i = 0; i < data.length; i++) {
        const x = padding.left + xStep * i;
        const y = padding.top + chartHeight - (data[i] / maxValue) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    };

    const drawFailureMarkers = (data: number[]) => {
      const xStep = chartWidth / (Math.max(data.length, 1) - 1 || 1);
      for (let i = 0; i < data.length; i++) {
        if (data[i] < 100) continue;
        const x = padding.left + xStep * i;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.moveTo(x, padding.top + chartHeight);
        ctx.lineTo(x, padding.top);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.arc(x, padding.top + 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawLatencyLine(maxData, '#f59e0b', isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.1)');
    drawLatencyLine(avgData, '#3b82f6', isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.15)');
    drawFailureMarkers(failData);
  }, [stats, isDark]);

  useCanvasChart(canvasRef, drawChart);

  const handleMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (stats.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const padding = { right: 20, left: 50 };
    const chartWidth = rect.width - padding.left - padding.right;
    const relativeX = Math.min(Math.max(event.clientX - rect.left, padding.left), rect.width - padding.right);
    const index = stats.length <= 1
      ? 0
      : Math.min(stats.length - 1, Math.max(0, Math.round(((relativeX - padding.left) / Math.max(chartWidth, 1)) * (stats.length - 1))));
    const left = stats.length <= 1
      ? padding.left
      : padding.left + (chartWidth / (stats.length - 1)) * index;
    setHover({
      point: stats[index],
      left,
      tooltipLeft: Math.min(rect.width - 112, Math.max(112, left)),
    });
  };

  const hoverSuccessRate = hover && hover.point.query_count > 0
    ? (hover.point.success_count / hover.point.query_count) * 100
    : 0;
  const hoverFailed = hover ? failureFlag(hover.point) === 100 : false;
  const hoverMaxLatency = hover && hover.point.success_count > 0 ? hover.point.max_latency : 0;

  return (
    <div className="relative h-40">
      <canvas
        ref={canvasRef}
        className="h-full w-full rounded-md bg-transparent"
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <>
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-gray-400/70 dark:bg-gray-500/70"
            style={{ left: hover.left }}
          />
          <div
            className="pointer-events-none absolute top-2 z-10 w-56 -translate-x-1/2 rounded-xl border border-slate-300/70 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur dark:border-slate-600/80 dark:bg-slate-950/95"
            style={{ left: hover.tooltipLeft }}
          >
            <div className="mb-2 font-black text-slate-50">
              {labels.time}: {new Date(hover.point.timestamp * 1000).toLocaleString()}
            </div>
            <div className="space-y-1 font-semibold tabular-nums">
              <div className="flex items-center justify-between gap-3 text-sky-300">
                <span className="text-slate-300">{labels.avgLatency}</span>
                <span>{formatLatencyMs(hover.point.avg_latency)} ms</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-amber-300">
                <span className="text-slate-300">{labels.maxLatency}</span>
                <span>{formatLatencyMs(hoverMaxLatency)} ms</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-emerald-300">
                <span className="text-slate-300">{labels.successRate}</span>
                <span>{hoverSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-rose-300">
                <span className="text-slate-300">{labels.failure}</span>
                <span>{hoverFailed ? '100%' : '0%'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-slate-200">
                <span className="text-slate-400">{labels.totalQueries}</span>
                <span>{hover.point.query_count}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
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
          setError(response.error || 'Unknown error');
          return;
        }
        setRecords(response.records || []);
        setStats(response.stats || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [serverAddress]);

  const recordsTotalPages = Math.max(1, Math.ceil(records.length / RECENT_RECORDS_PAGE_SIZE));
  const safeRecordsPage = Math.min(recordsPage, recordsTotalPages);
  const pagedRecords = records.slice(
    (safeRecordsPage - 1) * RECENT_RECORDS_PAGE_SIZE,
    safeRecordsPage * RECENT_RECORDS_PAGE_SIZE,
  );

  useEffect(() => {
    if (recordsPage !== safeRecordsPage) {
      setRecordsPage(safeRecordsPage);
    }
  }, [recordsPage, safeRecordsPage]);

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
  const maxLatencyClass = summary && summary.maxLatency > LATENCY_WARNING_MS
    ? 'text-lg font-bold text-red-500'
    : 'text-lg font-bold text-gray-900 dark:text-white';
  const successRateClass = summary && summary.successRate < SUCCESS_RATE_WARNING
    ? 'text-lg font-bold text-red-500'
    : 'text-lg font-bold text-green-600 dark:text-green-400';

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
          <LatencyChart
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
        <div>
          <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t.queryRecentRecords}</div>
          <div className="space-y-2">
            {pagedRecords.map((record, pageIndex) => {
              const index = (safeRecordsPage - 1) * RECENT_RECORDS_PAGE_SIZE + pageIndex;
              const time = new Date(record.timestamp * 1000).toLocaleString();
              const isExpanded = expandedRecord === index;
              const rowClass = record.success
                ? 'rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/80'
                : 'rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40';
              const statusClass = record.success
                ? 'rounded px-1.5 py-0.5 font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'rounded px-1.5 py-0.5 font-medium bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200';
              const durationClass = (!record.success || record.duration_ms > LATENCY_WARNING_MS)
                ? 'rounded px-1.5 py-0.5 font-mono bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                : 'rounded px-1.5 py-0.5 font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
              const nodeClass = record.is_from_node
                ? 'rounded px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : 'rounded px-1.5 py-0.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

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
                    <details open={isExpanded} onToggle={() => setExpandedRecord(isExpanded ? null : index)}>
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

          {recordsTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setRecordsPage((page) => Math.max(1, page - 1))}
                disabled={safeRecordsPage === 1}
                className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                {t.prevPage}
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {safeRecordsPage} / {recordsTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setRecordsPage((page) => Math.min(recordsTotalPages, page + 1))}
                disabled={safeRecordsPage === recordsTotalPages}
                className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                {t.nextPage}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
