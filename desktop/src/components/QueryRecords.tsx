import { useState, useEffect, useRef } from 'react';
import { getA2SDebug, type A2SQueryDebugRecord, type A2SLatencyStatPoint } from '@/api';
import { useI18n } from '@/store/i18n';

const LATENCY_WARNING_MS = 500;
const SUCCESS_RATE_WARNING = 90;

interface QueryRecordsProps {
  serverAddress: string; // e.g. "1.2.3.4:27015"
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
    if (s.avg_latency > 0) {
      totalLatency += s.avg_latency * s.query_count;
      latencyCount += s.query_count;
    }
    if (s.max_latency > maxLatency) {
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

function LatencyChart({ stats }: { stats: A2SLatencyStatPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stats.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const avgData = stats.map(s => s.avg_latency);
    const maxData = stats.map(s => s.max_latency);
    const maxValue = Math.max(...maxData, ...avgData, 1);

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      const value = Math.round(maxValue - (maxValue / gridLines) * i);
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${value}ms`, padding.left - 5, y + 4);
    }

    // X-axis labels
    const labelCount = Math.min(6, stats.length);
    const labelStep = Math.floor(stats.length / labelCount) || 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < stats.length; i += labelStep) {
      const x = padding.left + (chartWidth / (stats.length - 1 || 1)) * i;
      const date = new Date(stats[i].timestamp * 1000);
      ctx.fillText(date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }), x, height - 8);
    }

    // Draw line helper
    const drawLine = (data: number[], color: string, fillColor: string) => {
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

    // Draw max latency (behind)
    drawLine(maxData, '#f59e0b', 'rgba(245, 158, 11, 0.1)');
    // Draw avg latency (front)
    drawLine(avgData, '#3b82f6', 'rgba(59, 130, 246, 0.15)');
  }, [stats]);

  return (
    <div className="h-40">
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
    </div>
  );
}

export function QueryRecords({ serverAddress }: QueryRecordsProps) {
  const [records, setRecords] = useState<A2SQueryDebugRecord[]>([]);
  const [stats, setStats] = useState<A2SLatencyStatPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
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

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{summary.totalQueries}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.queryTotalQueries}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.avgLatency.toFixed(1)}<span className="text-xs ml-0.5">ms</span></div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.queryAvgLatency}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-center">
            <div className={`text-lg font-bold ${summary.maxLatency > LATENCY_WARNING_MS ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{summary.maxLatency.toFixed(1)}<span className="text-xs ml-0.5">ms</span></div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.queryMaxLatency}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-center">
            <div className={`text-lg font-bold ${summary.successRate < SUCCESS_RATE_WARNING ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{summary.successRate.toFixed(1)}<span className="text-xs ml-0.5">%</span></div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t.querySuccessRate}</div>
          </div>
        </div>
      )}

      {/* Latency chart */}
      {stats.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t.queryLatencyChart}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.queryLatencyChartDesc}</div>
          <LatencyChart stats={stats} />
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">{t.queryAvgLatency}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-gray-600 dark:text-gray-400">{t.queryMaxLatency}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent records */}
      {records.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t.queryRecentRecords}</div>
          <div className="space-y-2">
            {records.map((record, index) => {
              const time = new Date(record.timestamp * 1000).toLocaleString();
              const isExpanded = expandedRecord === index;
              return (
                <div key={index} className={`p-3 rounded-lg border ${record.success ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center flex-wrap gap-1.5 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-mono">#{index + 1}</span>
                    <span className={`px-1.5 py-0.5 rounded font-medium ${record.success ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      {record.success ? t.querySuccess : t.queryFailed}
                    </span>
                    {record.duration_ms > 0 && (
                      <span className={`px-1.5 py-0.5 rounded font-mono ${record.duration_ms > LATENCY_WARNING_MS ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {record.duration_ms.toFixed(2)}ms
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded ${record.is_from_node ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {record.is_from_node ? `${t.queryRemoteNode}: ${record.node_name}` : t.queryLocalNode}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 ml-auto">{time}</span>
                  </div>
                  {record.error_message && (
                    <div className="mt-1.5 text-xs text-red-600 dark:text-red-400">{t.queryError}: {record.error_message}</div>
                  )}
                  {record.a2s_data && Object.keys(record.a2s_data).length > 0 && (
                    <details open={isExpanded} onToggle={() => setExpandedRecord(isExpanded ? null : index)}>
                      <summary className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                        {t.queryA2SData} ({t.queryClickToExpand})
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto max-h-40 text-gray-700 dark:text-gray-300">
                        {JSON.stringify(record.a2s_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
