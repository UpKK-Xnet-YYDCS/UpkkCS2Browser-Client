import { useEffect, useRef, useState } from 'react';
import { isTauriAvailable, queryServerA2S } from '@/services/a2s';
import {
  createLatencyProbeSession,
  getLatencyProbeMetrics,
  type LatencyProbeSession,
  type LatencyProbeSummary,
  type LatencyProbeTarget,
} from '@/services/latencyProbe';
import { buildLatencyProbeStartPlan, type LatencyProbeFormValues } from '@/services/latencyProbeForm';
import type { LatencyDetectionSettings } from '@/services/latencySettings';

const EMPTY_SUMMARY: LatencyProbeSummary = {
  samples: [],
  metrics: getLatencyProbeMetrics([]),
};

interface UseLatencyProbeSessionOptions {
  target: LatencyProbeTarget | null | undefined;
  noTargetMessage: string;
  unavailableMessage: string;
  latencyDetectionSettings: Pick<LatencyDetectionSettings, 'a2sTimeoutMs' | 'retryCount' | 'retryDelayMs'>;
}

export function useLatencyProbeSession({
  target,
  noTargetMessage,
  unavailableMessage,
  latencyDetectionSettings,
}: UseLatencyProbeSessionOptions) {
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

  const start = () => {
    if (!target) {
      setError(noTargetMessage);
      return;
    }
    if (!isTauriAvailable()) {
      setError(unavailableMessage);
      return;
    }

    const plan = buildLatencyProbeStartPlan({
      intervalSeconds,
      durationSeconds,
      timeoutSeconds,
      retryCount,
      retryDelayMs,
    });
    setIntervalSeconds(plan.form.intervalSeconds);
    setDurationSeconds(plan.form.durationSeconds);
    setTimeoutSeconds(plan.form.timeoutSeconds);
    setRetryCount(plan.form.retryCount);
    setRetryDelayMs(plan.form.retryDelayMs);
    setSummary(EMPTY_SUMMARY);
    setError(undefined);
    setRunning(true);

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const session = createLatencyProbeSession({
      target,
      options: plan.options,
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

  const stop = () => {
    runIdRef.current += 1;
    sessionRef.current?.stop();
    sessionRef.current = null;
    setRunning(false);
  };

  const applyFormPatch = (patch: Partial<LatencyProbeFormValues>) => {
    if (patch.intervalSeconds !== undefined) setIntervalSeconds(patch.intervalSeconds);
    if (patch.durationSeconds !== undefined) setDurationSeconds(patch.durationSeconds);
    if (patch.timeoutSeconds !== undefined) setTimeoutSeconds(patch.timeoutSeconds);
    if (patch.retryCount !== undefined) setRetryCount(patch.retryCount);
    if (patch.retryDelayMs !== undefined) setRetryDelayMs(patch.retryDelayMs);
  };

  const unavailableText = !target ? noTargetMessage : !isTauriAvailable() ? unavailableMessage : undefined;

  return {
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
  };
}
