import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { ServerStatus } from '@/types';
import { isTauriAvailable, queryServerA2S } from '@/services/a2s';
import { getServerLatencyTarget } from '@/services/latencyDisplay';
import {
  createLatencyProbeSession,
  getLatencyProbeMetrics,
  getLatencyProbeSeries,
  normalizeLatencyProbeOptions,
  type LatencyProbeSample,
  type LatencyProbeSeriesPoint,
  type LatencyProbeSession,
  type LatencyProbeSummary,
} from '@/services/latencyProbe';
import { useI18n } from '@/hooks/useI18n';
import { useLatencyDetectionSettings } from '@/services/latencySettings';

interface LatencyProbeModalProps {
  server: ServerStatus;
  onClose: () => void;
}

const EMPTY_SUMMARY: LatencyProbeSummary = {
  samples: [],
  metrics: getLatencyProbeMetrics([]),
};

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16M7 15l3-4 3 2 4-7" />
  </svg>
);

function getNumericInput(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function formatMs(value: number | undefined): string {
  if (!Number.isFinite(value)) return '--';
  return `${Math.round(value ?? 0)} ms`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function getServerLabel(server: ServerStatus): string {
  const ip = String(server.ip || server.Addr || '').trim();
  const port = String(server.port || server.Port || '').trim();
  const rawBaseAddress = String(server.display_address || ip).trim();
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  return port ? `${baseAddress || ip}:${port}` : baseAddress || ip;
}

interface LatencyProbeChartProps {
  samples: LatencyProbeSample[];
  emptyLabel: string;
  rttLabel: string;
  packetLossLabel: string;
  stabilityLabel: string;
  sampleLabel: string;
  failureReasonLabel: string;
}

function LatencyProbeChart({
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
            {sampleLabel} #{hover.point.sequence} · {hoverTime}
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

export function LatencyProbeModal({ server, onClose }: LatencyProbeModalProps) {
  const { t } = useI18n();
  const latencyDetectionSettings = useLatencyDetectionSettings();
  const target = useMemo(() => getServerLatencyTarget(server), [server]);
  const serverName = server.name || server.Name || 'Unknown Server';
  const serverAddress = getServerLabel(server);
  const [intervalSeconds, setIntervalSeconds] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [timeoutSeconds, setTimeoutSeconds] = useState(3);
  const [retryCount, setRetryCount] = useState(latencyDetectionSettings.retryCount);
  const [retryDelayMs, setRetryDelayMs] = useState(latencyDetectionSettings.retryDelayMs);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<LatencyProbeSummary>(EMPTY_SUMMARY);
  const [error, setError] = useState<string | undefined>();
  const sessionRef = useRef<LatencyProbeSession | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  const handleStart = () => {
    if (!target) {
      setError(t.latencyProbeNoTarget);
      return;
    }
    if (!isTauriAvailable()) {
      setError(t.localA2SUnavailable);
      return;
    }

    const normalized = normalizeLatencyProbeOptions({
      intervalMs: intervalSeconds * 1_000,
      durationMs: durationSeconds * 1_000,
      timeoutMs: timeoutSeconds * 1_000,
      retryCount,
      retryDelayMs,
    });
    setIntervalSeconds(normalized.intervalMs / 1_000);
    setDurationSeconds(normalized.durationMs / 1_000);
    setTimeoutSeconds(normalized.timeoutMs / 1_000);
    setRetryCount(normalized.retryCount);
    setRetryDelayMs(normalized.retryDelayMs);
    setSummary(EMPTY_SUMMARY);
    setError(undefined);
    setRunning(true);

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const session = createLatencyProbeSession({
      target,
      options: normalized,
      query: queryServerA2S,
      onSample: (_sample, nextSummary) => {
        if (runIdRef.current === runId) {
          setSummary(nextSummary);
        }
      },
    });
    sessionRef.current = session;

    void session.start()
      .then(finalSummary => {
        if (runIdRef.current === runId) {
          setSummary(finalSummary);
        }
      })
      .catch(cause => {
        if (runIdRef.current === runId) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (runIdRef.current === runId) {
          setRunning(false);
          sessionRef.current = null;
        }
      });
  };

  const handleStop = () => {
    runIdRef.current += 1;
    sessionRef.current?.stop();
    sessionRef.current = null;
    setRunning(false);
  };

  const metrics = summary.metrics;
  const metricItems = [
    { label: t.latencyProbeSent, value: String(metrics.sent) },
    { label: t.latencyProbeReceived, value: String(metrics.received) },
    { label: t.latencyProbePacketLoss, value: formatPercent(metrics.packetLossPercent) },
    { label: t.latencyProbeAverage, value: formatMs(metrics.avgLatencyMs) },
    { label: t.latencyProbeMin, value: formatMs(metrics.minLatencyMs) },
    { label: t.latencyProbeMax, value: formatMs(metrics.maxLatencyMs) },
    { label: t.latencyProbeStability, value: formatMs(metrics.rttStabilityMs) },
  ];

  const statusText = running ? t.latencyProbeRunning : t.latencyProbeIdle;
  const unavailableText = !target ? t.latencyProbeNoTarget : !isTauriAvailable() ? t.localA2SUnavailable : undefined;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={(event) => { event.stopPropagation(); onClose(); }}>
      <div className="max-h-[min(92vh,820px)] w-full max-w-[min(92vw,900px)] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <ChartIcon />
              <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.latencyProbeTitle}</h2>
            </div>
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{serverName} · {serverAddress}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label={t.cancel}
            title={t.cancel}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">{t.latencyProbeInterval}</span>
              <input
                type="number"
                min="1"
                max="60"
                step="1"
                value={intervalSeconds}
                disabled={running}
                onChange={event => setIntervalSeconds(getNumericInput(event.target.value, 1))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">{t.latencyProbeDuration}</span>
              <input
                type="number"
                min="5"
                max="1800"
                step="5"
                value={durationSeconds}
                disabled={running}
                onChange={event => setDurationSeconds(getNumericInput(event.target.value, 120))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">{t.latencyProbeTimeout}</span>
              <input
                type="number"
                min="0.5"
                max="5"
                step="0.5"
                value={timeoutSeconds}
                disabled={running}
                onChange={event => setTimeoutSeconds(getNumericInput(event.target.value, 3))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">{t.latencyProbeRetries}</span>
              <input
                type="number"
                min="0"
                max="5"
                step="1"
                value={retryCount}
                disabled={running}
                onChange={event => setRetryCount(getNumericInput(event.target.value, latencyDetectionSettings.retryCount))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500 dark:text-gray-400">{t.latencyRetryDelay}</span>
              <input
                type="number"
                min="0"
                max="3000"
                step="50"
                value={retryDelayMs}
                disabled={running}
                onChange={event => setRetryDelayMs(getNumericInput(event.target.value, latencyDetectionSettings.retryDelayMs))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {statusText}
            </span>
            <div className="flex items-center gap-2">
              {running ? (
                <button
                  onClick={handleStop}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600"
                >
                  {t.latencyProbeStop}
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={Boolean(unavailableText)}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.latencyProbeStart}
                </button>
              )}
            </div>
          </div>

          {(error || unavailableText) && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error || unavailableText}
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">{t.latencyProbeChart}</h3>
              <span className="text-xs font-semibold text-gray-400">{summary.samples.length}</span>
            </div>
            <LatencyProbeChart
              samples={summary.samples}
              emptyLabel={t.latencyProbeNoSamples}
              rttLabel={t.latencyProbeRtt}
              packetLossLabel={t.latencyProbePacketLoss}
              stabilityLabel={t.latencyProbeStability}
              sampleLabel={t.latencyProbeSample}
              failureReasonLabel={t.latencyProbeFailureReason}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metricItems.map(item => (
              <div key={item.label} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700">
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.label}</div>
                <div className="mt-1 text-lg font-black tabular-nums text-gray-900 dark:text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
