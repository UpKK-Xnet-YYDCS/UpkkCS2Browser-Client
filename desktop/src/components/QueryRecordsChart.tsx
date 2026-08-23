import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { A2SLatencyStatPoint } from '@/api/history';
import { useCanvasChart } from '@/hooks/useCanvasChart';
import { pickCanvasChartHover } from '@/services/canvasChartHover';
import {
  QUERY_RECORDS_CHART_PADDING,
  canvasChartPlotRect,
  drawCanvasAreaLine,
  drawCanvasFailureMarkers,
  drawCanvasGridAndYAxis,
  drawCanvasXAxisLabels,
} from '@/services/canvasLineChart';
import { queryRecordsHoverView } from '@/services/queryRecordsPresentation';
import { failureFlag, formatLatencyMs } from '@/services/queryRecordsStats';

interface QueryRecordsChartProps {
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

export function QueryRecordsChart({ stats, labels, isDark }: QueryRecordsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ point: A2SLatencyStatPoint; left: number; tooltipLeft: number } | null>(null);

  const drawChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (stats.length === 0) return;

    const plot = canvasChartPlotRect(width, height, QUERY_RECORDS_CHART_PADDING);
    const avgData = stats.map(s => s.avg_latency);
    const maxData = stats.map(s => (s.success_count > 0 ? s.max_latency : 0));
    const failData = stats.map(s => failureFlag(s));
    const maxValue = Math.max(...maxData, ...avgData, 1);
    const gridColor = isDark ? 'rgba(75, 85, 99, 0.55)' : '#e5e7eb';
    const axisText = isDark ? '#9ca3af' : '#6b7280';

    drawCanvasGridAndYAxis(ctx, plot, maxValue, {
      gridColor,
      labelColor: axisText,
      font: '10px sans-serif',
      formatLabel: (value) => value + 'ms',
    });
    drawCanvasXAxisLabels(ctx, height, plot, stats.length, {
      color: axisText,
      font: '10px sans-serif',
      getLabel: (index) => new Date(stats[index].timestamp * 1000).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    drawCanvasAreaLine(ctx, plot, maxData, maxValue, '#f59e0b', isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.1)');
    drawCanvasAreaLine(ctx, plot, avgData, maxValue, '#3b82f6', isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.15)');
    drawCanvasFailureMarkers(ctx, plot, failData);
  }, [stats, isDark]);

  useCanvasChart(canvasRef, drawChart);

  const handleMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const nextHover = pickCanvasChartHover(
      event.currentTarget.getBoundingClientRect(),
      event.clientX,
      stats.length,
      { left: QUERY_RECORDS_CHART_PADDING.left, right: QUERY_RECORDS_CHART_PADDING.right, tooltipHalf: 112 },
    );
    if (!nextHover) return;
    setHover({
      point: stats[nextHover.index],
      left: nextHover.left,
      tooltipLeft: nextHover.tooltipLeft,
    });
  };

  const hoverView = hover ? queryRecordsHoverView(hover.point) : null;
  const hoverSuccessRate = hoverView?.successRate ?? 0;
  const hoverFailed = hoverView?.failed ?? false;
  const hoverMaxLatency = hoverView?.maxLatency ?? 0;

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
