import { useState, useEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { getServerPlayerHistory, type PlayerHistoryStat } from '@/api/history';
import { useI18n } from '@/hooks/useI18n';
import { useCanvasChart } from '@/hooks/useCanvasChart';
import { pickCanvasChartHover } from '@/services/canvasChartHover';
import {
  PLAYER_HISTORY_CHART_PADDING,
  canvasChartPlotRect,
  drawCanvasAreaLine,
  drawCanvasGridAndYAxis,
  drawCanvasXAxisLabels,
} from '@/services/canvasLineChart';
import {
  formatPlayerHistoryXAxisLabel,
  playerHistoryHoverCounts,
  playerHistorySeries,
  type PlayerHistoryPeriod,
} from '@/services/playerHistorySeries';

interface PlayerHistoryChartProps {
  serverId: string;
}

// ChartIcon
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

export function PlayerHistoryChart({ serverId }: PlayerHistoryChartProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<PlayerHistoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PlayerHistoryPeriod>('24h');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ point: PlayerHistoryStat; left: number; tooltipLeft: number } | null>(null);
  
  // Get periods with translations
  const PERIODS: { value: PlayerHistoryPeriod; label: string }[] = [
    { value: '6h', label: t.period6h },
    { value: '12h', label: t.period12h },
    { value: '24h', label: t.period24h },
    { value: '7d', label: t.period7d },
    { value: '30d', label: t.period30d },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getServerPlayerHistory(serverId, period);
      setStats(response.stats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadFailed);
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [period, serverId, t.loadFailed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const drawChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (stats.length === 0) return;

    const plot = canvasChartPlotRect(width, height, PLAYER_HISTORY_CHART_PADDING);
    const { realPlayers, bots, maxValue } = playerHistorySeries(stats);

    drawCanvasGridAndYAxis(ctx, plot, maxValue, {
      gridColor: '#e5e7eb',
      labelColor: '#6b7280',
      font: '11px sans-serif',
      formatLabel: (value) => String(value),
    });
    drawCanvasXAxisLabels(ctx, height, plot, stats.length, {
      color: '#6b7280',
      font: '10px sans-serif',
      getLabel: (index) => formatPlayerHistoryXAxisLabel(stats[index].timestamp, period),
    });
    if (bots.some(b => b > 0)) {
      drawCanvasAreaLine(ctx, plot, bots, maxValue, '#f59e0b', 'rgba(245, 158, 11, 0.15)');
    }
    drawCanvasAreaLine(ctx, plot, realPlayers, maxValue, '#3b82f6', 'rgba(59, 130, 246, 0.2)');
  }, [stats, period]);

  // Use the canvas chart hook for reliable rendering with ResizeObserver + retry
  useCanvasChart(canvasRef, drawChart);

  const handleMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const nextHover = pickCanvasChartHover(
      event.currentTarget.getBoundingClientRect(),
      event.clientX,
      stats.length,
      { left: PLAYER_HISTORY_CHART_PADDING.left, right: PLAYER_HISTORY_CHART_PADDING.right, tooltipHalf: 104 },
    );
    if (!nextHover) return;
    setHover({
      point: stats[nextHover.index],
      left: nextHover.left,
      tooltipLeft: nextHover.tooltipLeft,
    });
  };

  const hoverCounts = hover ? playerHistoryHoverCounts(hover.point) : { realPlayers: 0, bots: 0 };
  const hoverRealPlayers = hoverCounts.realPlayers;
  const hoverBots = hoverCounts.bots;

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChartIcon />
          <h3 className="font-semibold text-gray-900 dark:text-white">{t.playerHistory}</h3>
        </div>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === p.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      ) : stats.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          {t.noHistoryData}
        </div>
      ) : (
        <>
          <div className="relative h-40">
            <canvas
              ref={canvasRef}
              className="h-full w-full"
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
                  className="pointer-events-none absolute top-2 z-10 w-52 -translate-x-1/2 rounded-lg border border-gray-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-950/95"
                  style={{ left: hover.tooltipLeft }}
                >
                  <div className="mb-2 font-black text-gray-900 dark:text-white">
                    {t.chartTooltipTime}: {new Date(hover.point.timestamp).toLocaleString()}
                  </div>
                  <div className="space-y-1 font-semibold tabular-nums">
                    <div className="flex items-center justify-between gap-3 text-blue-600 dark:text-blue-300">
                      <span>{t.realPlayers}</span>
                      <span>{hoverRealPlayers}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-amber-600 dark:text-amber-300">
                      <span>{t.bots}</span>
                      <span>{hoverBots}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-gray-600 dark:text-gray-400">{t.realPlayers}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span className="text-gray-600 dark:text-gray-400">{t.bots}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
