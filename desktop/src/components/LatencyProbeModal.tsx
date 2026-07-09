import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ServerStatus } from '@/types';
import { isTauriAvailable, queryServerA2S } from '@/services/a2s';
import { getServerLatencyTarget } from '@/services/latencyDisplay';
import {
  createLatencyProbeSession,
  getLatencyProbeMetrics,
  normalizeLatencyProbeOptions,
  type LatencyProbeSession,
  type LatencyProbeSummary,
} from '@/services/latencyProbe';
import { useI18n } from '@/hooks/useI18n';
import { useLatencyDetectionSettings } from '@/services/latencySettings';
import { LatencyProbeChart } from '@/components/latency/LatencyProbeChart';
import { LatencyProbeMetricsGrid } from '@/components/latency/LatencyProbeMetricsGrid';

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

function getServerLabel(server: ServerStatus): string {
  const ip = String(server.ip || server.Addr || '').trim();
  const port = String(server.port || server.Port || '').trim();
  const rawBaseAddress = String(server.display_address || ip).trim();
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  return port ? `${baseAddress || ip}:${port}` : baseAddress || ip;
}

export function LatencyProbeModal({ server, onClose }: LatencyProbeModalProps) {
  const { t } = useI18n();
  const latencyDetectionSettings = useLatencyDetectionSettings();
  const target = useMemo(() => getServerLatencyTarget(server), [server]);
  const serverName = server.name || server.Name || 'Unknown Server';
  const serverAddress = getServerLabel(server);
  const [intervalSeconds, setIntervalSeconds] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [timeoutSeconds, setTimeoutSeconds] = useState(() => latencyDetectionSettings.a2sTimeoutMs / 1_000);
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
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{serverName} - {serverAddress}</p>
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

          <LatencyProbeMetricsGrid
            metrics={summary.metrics}
            labels={{
              sent: t.latencyProbeSent,
              received: t.latencyProbeReceived,
              packetLoss: t.latencyProbePacketLoss,
              attemptLoss: t.latencyProbeAttemptLoss,
              average: t.latencyProbeAverage,
              min: t.latencyProbeMin,
              max: t.latencyProbeMax,
              stability: t.latencyProbeStability,
            }}
          />
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
