import type { LocalLatencyQueryResult } from './a2sLatencyTypes.ts';
import type { LatencyProbeAttempt, LatencyProbeSample } from './latencyProbeTypes.ts';

export function buildLatencyProbeAttempt(input: {
  sequence: number;
  attempt: number;
  startedAt: number;
  completedAt: number;
  status: 'success' | 'failed';
  latencyMs?: number;
  error?: string;
}): LatencyProbeAttempt {
  const elapsedMs = Math.max(0, input.completedAt - input.startedAt);
  if (input.status === 'success') {
    return {
      sequence: input.sequence,
      attempt: input.attempt,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      status: 'success',
      elapsedMs,
      latencyMs: Math.max(0, Math.round(input.latencyMs ?? 0)),
    };
  }
  return {
    sequence: input.sequence,
    attempt: input.attempt,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    status: 'failed',
    elapsedMs,
    error: input.error,
  };
}

export function buildLatencyProbeSample(
  sequence: number,
  startedAt: number,
  completedAt: number,
  result: LocalLatencyQueryResult,
  attempts: LatencyProbeAttempt[],
): LatencyProbeSample {
  const observedLatencyMs = Math.max(0, completedAt - startedAt);
  if (result.success && Number.isFinite(result.latency_ms)) {
    return {
      sequence,
      startedAt,
      completedAt,
      status: 'success',
      observedLatencyMs,
      attempts,
      latencyMs: Math.max(0, Math.round(result.latency_ms ?? 0)),
    };
  }
  return {
    sequence,
    startedAt,
    completedAt,
    status: 'failed',
    observedLatencyMs,
    attempts,
    error: result.error || 'A2S latency unavailable',
  };
}

