import { useCallback, useEffect, useRef } from 'react';
import type { MapSessionRecord } from '@/api/history';
import { useCanvasChart } from '@/hooks/useCanvasChart';
import { useI18n } from '@/hooks/useI18n';
import {
  PLAYER_HISTORY_CHART_PADDING,
  canvasChartPlotRect,
  drawCanvasAreaLine,
  drawCanvasGridAndYAxis,
  drawCanvasXAxisLabels,
} from '@/services/canvasLineChart';
import { formatDuration, resolveMapHistoryLocale } from '@/services/mapHistoryFormat';
import {
  formatMapSessionAxisTime,
  mapSessionChartSeries,
  mapSessionSampleInterval,
} from '@/services/mapHistoryPresentation';
import { ChartIcon, CloseIcon, MapIcon } from './mapHistoryIcons';

export function MapSessionModal({
  session,
  isCurrentMap,
  onClose,
}: {
  session: MapSessionRecord;
  isCurrentMap: boolean;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawChart = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!session.player_history || session.player_history.length === 0) return;

    const plot = canvasChartPlotRect(width, height, PLAYER_HISTORY_CHART_PADDING);
    const { realPlayers, bots, maxValue } = mapSessionChartSeries(session.player_history, session.bot_history);
    const startTime = new Date(session.start_time);
    const intervalSecs = mapSessionSampleInterval(session.duration_secs, realPlayers.length);

    drawCanvasGridAndYAxis(ctx, plot, maxValue, {
      gridColor: '#e5e7eb',
      labelColor: '#6b7280',
      font: '11px sans-serif',
      formatLabel: (value) => String(value),
    });
    drawCanvasXAxisLabels(ctx, height, plot, realPlayers.length, {
      color: '#6b7280',
      font: '10px sans-serif',
      getLabel: (index) => formatMapSessionAxisTime(startTime.getTime() + index * intervalSecs * 1000),
    });
    if (bots.length > 0 && bots.some(b => b > 0)) {
      drawCanvasAreaLine(ctx, plot, bots, maxValue, '#f59e0b', 'rgba(245, 158, 11, 0.15)');
    }
    drawCanvasAreaLine(ctx, plot, realPlayers, maxValue, '#3b82f6', 'rgba(59, 130, 246, 0.2)');
  }, [session]);

  // Use the canvas chart hook for reliable rendering with ResizeObserver + retry
  useCanvasChart(canvasRef, drawChart);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const locale = resolveMapHistoryLocale(language);

  const startTime = new Date(session.start_time);
  const endTime = new Date(session.end_time);
  const startStr = startTime.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const endStr = isCurrentMap ? t.serverRunning + '...' : endTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapIcon />
            <h3 className="font-bold">{session.map_name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Duration Stats */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">⏱️ {t.runtime}</div>
            <div className={'font-bold text-lg ' + (isCurrentMap ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white')}>
              {formatDuration(session.duration_secs, t)}
              {isCurrentMap && <span className="ml-2 text-xs animate-pulse">● {t.serverRunning}</span>}
            </div>
          </div>

          {/* Player Chart */}
          {session.player_history && session.player_history.length > 0 ? (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartIcon />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.playerCountCurve}</span>
              </div>
              <div className="h-40 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">{t.realPlayers}</span>
                </div>
                {session.bot_history && session.bot_history.some(b => b > 0) && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-amber-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">{t.bots}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4 text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
              {t.noPlayerCurveData}
            </div>
          )}

          {/* Time Range */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            {startStr} ~ {endStr}
          </div>
        </div>
      </div>
    </div>
  );
}
