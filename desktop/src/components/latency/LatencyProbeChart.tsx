import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  getLatencyProbeSeries,
  type LatencyProbeSample,
  type LatencyProbeSeriesPoint,
} from '@/services/latencyProbe';

interface LatencyProbeChartProps {
  samples: LatencyProbeSample[];
  emptyLabel: string;
  rttLabel: string;
  packetLossLabel: string;
  stabilityLabel: string;
  sampleLabel: string;
  failureReasonLabel: string;
}

function formatMs(value: number | undefined): string {
  if (!Number.isFinite(value)) return '--';
  return `${Math.round(value ?? 0)} ms`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

export function LatencyProbeChart({
  samples,
  emptyLabel,
  rttLabel,
  packetLossLabel,
  stabilityLabel,
  sampleLabel,
  failureReasonLabel,
}: LatencyProbeChartProps) {
  const width = 560;
  const height = 220;
  const padding = 42;
  const points = useMemo(() => getLatencyProbeSeries(samples), [samples]);
  const [hover, setHover] = useState<{ point: LatencyProbeSeriesPoint; left: number; x: number } | null>(null);
  const successPoints = points.filter(point => point.status === 'success' && Number.isFinite(point.latencyMs));
  const maxSequence = Math.max(1, ...points.map(point => point.sequence));
  const maxMs = Math.max(
    100,
    ...points.map(point => point.latencyMs ?? 0),
    ...points.map(point => point.rttStabilityMs ?? 0),
  );
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const getX = (sequence: number) => {
    if (maxSequence <= 1) return padding;
    return padding + ((sequence - 1) / (maxSequence - 1)) * plotWidth;
  };
  const getYForMs = (value: number) => padding + plotHeight - (Math.min(value, maxMs) / maxMs) * plotHeight;
  const getYForPercent = (value: number) => padding + plotHeight - (Math.min(value, 100) / 100) * plotHeight;
  const buildPath = (
    getValue: (point: LatencyProbeSeriesPoint) => number | undefined,
    getY: (value: number) => number,
  ) => {
    let hasSegment = false;
    return points
      .map(point => {
        const value = getValue(point);
        if (!Number.isFinite(value)) {
          hasSegment = false;
          return '';
        }
        const x = getX(point.sequence);
        const y = getY(value ?? 0);
        const command = hasSegment ? 'L' : 'M';
        hasSegment = true;
        return `${command} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  const rttPath = buildPath(point => point.latencyMs, getYForMs);
  const lossPath = buildPath(point => point.packetLossPercent, getYForPercent);
  const stabilityPath = buildPath(point => point.rttStabilityMs, getYForMs);
  const hoverTime = hover ? new Date(hover.point.startedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) : '';

  const handleMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const chartX = ((event.clientX - rect.left) / rect.width) * width;
    const nearest = points.reduce((best, point) => {
      const bestDistance = Math.abs(getX(best.sequence) - chartX);
      const pointDistance = Math.abs(getX(point.sequence) - chartX);
      return pointDistance < bestDistance ? point : best;
    }, points[0]);
    const x = getX(nearest.sequence);
    setHover({
      point: nearest,
      x,
      left: Math.min(82, Math.max(18, (x / width) * 100)),
    });
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {points.length === 0 && (
        <div className="absolute inset-0 z-10 grid place-items-center text-sm font-medium text-gray-400">
          {emptyLabel}
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute top-3 z-20 w-52 -translate-x-1/2 rounded-lg border border-gray-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-950/95"
          style={{ left: `${hover.left}%` }}
        >
          <div className="mb-2 font-black text-gray-900 dark:text-white">
            {sampleLabel} #{hover.point.sequence} - {hoverTime}
          </div>
          <div className="space-y-1 font-semibold tabular-nums">
            <div className="flex items-center justify-between gap-3 text-blue-600 dark:text-blue-300">
              <span>{rttLabel}</span>
              <span>{formatMs(hover.point.latencyMs)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-red-600 dark:text-red-300">
              <span>{packetLossLabel}</span>
              <span>{formatPercent(hover.point.packetLossPercent)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-orange-600 dark:text-orange-300">
              <span>{stabilityLabel}</span>
              <span>{formatMs(hover.point.rttStabilityMs)}</span>
            </div>
          </div>
          {hover.point.status === 'failed' && hover.point.error && (
            <div className="mt-2 border-t border-gray-100 pt-2 text-red-600 dark:border-gray-800 dark:text-red-300">
              {failureReasonLabel}: {hover.point.error}
            </div>
          )}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full touch-none"
        role="img"
        aria-label={emptyLabel}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <path d={`M ${padding} ${padding} H ${padding} ${height - padding} H ${width - padding}`} stroke="currentColor" className="text-gray-200 dark:text-gray-700" fill="none" />
        {[0, 0.25, 0.5, 0.75, 1].map(line => {
          const y = padding + plotHeight * line;
          const msValue = Math.round(maxMs * (1 - line));
          const percentValue = Math.round(100 * (1 - line));
          return (
            <g key={line}>
              <path
                d={`M ${padding} ${y} H ${width - padding}`}
                stroke="currentColor"
                className={line === 1 ? 'text-gray-200 dark:text-gray-700' : 'text-gray-100 dark:text-gray-800'}
                fill="none"
              />
              <text x={padding - 6} y={y + 3} textAnchor="end" className="fill-gray-400 text-[10px] font-semibold">
                {msValue}ms
              </text>
              <text x={width - padding + 6} y={y + 3} textAnchor="start" className="fill-gray-400 text-[10px] font-semibold">
                {percentValue}%
              </text>
            </g>
          );
        })}
        <text x={padding - 4} y={padding - 12} textAnchor="end" className="fill-gray-400 text-[10px] font-semibold">
          ms
        </text>
        <text x={width - padding + 4} y={padding - 12} textAnchor="start" className="fill-gray-400 text-[10px] font-semibold">
          %
        </text>
        {lossPath && (
          <path d={lossPath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500" />
        )}
        {stabilityPath && (
          <path d={stabilityPath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500" />
        )}
        {rttPath && (
          <path d={rttPath} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500" />
        )}
        {successPoints.map(point => (
          <circle
            key={`ok-${point.sequence}`}
            cx={getX(point.sequence)}
            cy={getYForMs(point.latencyMs ?? 0)}
            r="4"
            className="fill-blue-500 stroke-white dark:stroke-gray-900"
            strokeWidth="2"
          />
        ))}
        {points.filter(point => point.status === 'failed').map(point => (
          <g key={`fail-${point.sequence}`} className="text-red-500">
            <circle cx={getX(point.sequence)} cy={height - padding} r="4" fill="currentColor" />
            <path d={`M ${getX(point.sequence) - 5} ${height - padding - 9} L ${getX(point.sequence) + 5} ${height - padding - 19} M ${getX(point.sequence) + 5} ${height - padding - 9} L ${getX(point.sequence) - 5} ${height - padding - 19}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
        {hover && (
          <path
            d={`M ${hover.x} ${padding} V ${height - padding}`}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-gray-400 dark:text-gray-500"
          />
        )}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-3 px-3 pb-3 text-[11px] font-bold text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />{rttLabel}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{packetLossLabel}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />{stabilityLabel}</span>
      </div>
    </div>
  );
}
