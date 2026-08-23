import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ServerStatus } from '@/types';
import { getServerLatencyTarget } from '@/services/latencyDisplay';
import { useI18n } from '@/hooks/useI18n';
import { useLatencyProbeSession } from '@/hooks/useLatencyProbeSession';
import { useLatencyDetectionSettings } from '@/services/latencySettings';
import { LatencyProbeChart } from '@/components/latency/LatencyProbeChart';
import { LatencyProbeMetricsGrid } from '@/components/latency/LatencyProbeMetricsGrid';
import { LatencyProbeOptionsForm } from '@/components/latency/LatencyProbeOptionsForm';
import { formatLatencyProbeServerLabel } from '@/services/latencyProbeFormat';

interface LatencyProbeModalProps {
  server: ServerStatus;
  onClose: () => void;
}

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

export function LatencyProbeModal({ server, onClose }: LatencyProbeModalProps) {
  const { t } = useI18n();
  const latencyDetectionSettings = useLatencyDetectionSettings();
  const target = useMemo(() => getServerLatencyTarget(server), [server]);
  const serverName = server.name || server.Name || 'Unknown Server';
  const serverAddress = formatLatencyProbeServerLabel(server);
  const {
    intervalSeconds,
    durationSeconds,
    timeoutSeconds,
    retryCount,
    retryDelayMs,
    running,
    summary,
    error,
    unavailableText,
    start,
    stop,
    applyFormPatch,
  } = useLatencyProbeSession({
    target,
    noTargetMessage: t.latencyProbeNoTarget,
    unavailableMessage: t.localA2SUnavailable,
    latencyDetectionSettings,
  });

  const statusText = running ? t.latencyProbeRunning : t.latencyProbeIdle;

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
          <LatencyProbeOptionsForm
            intervalSeconds={intervalSeconds}
            durationSeconds={durationSeconds}
            timeoutSeconds={timeoutSeconds}
            retryCount={retryCount}
            retryDelayMs={retryDelayMs}
            disabled={running}
            labels={{
              interval: t.latencyProbeInterval,
              duration: t.latencyProbeDuration,
              timeout: t.latencyProbeTimeout,
              retries: t.latencyProbeRetries,
              retryDelay: t.latencyRetryDelay,
            }}
            retryFallback={{
              retryCount: latencyDetectionSettings.retryCount,
              retryDelayMs: latencyDetectionSettings.retryDelayMs,
            }}
            onChange={applyFormPatch}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {statusText}
            </span>
            <div className="flex items-center gap-2">
              {running ? (
                <button
                  onClick={stop}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600"
                >
                  {t.latencyProbeStop}
                </button>
              ) : (
                <button
                  onClick={start}
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
