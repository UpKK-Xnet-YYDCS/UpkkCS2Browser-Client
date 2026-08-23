import { normalizeLatencyProbeOptions } from './latencyProbeMetrics.ts';
import type { LatencyProbeOptions, NormalizedLatencyProbeOptions } from './latencyProbeTypes.ts';

export interface LatencyProbeFormValues {
  intervalSeconds: number;
  durationSeconds: number;
  timeoutSeconds: number;
  retryCount: number;
  retryDelayMs: number;
}

export function latencyProbeFormToOptions(form: LatencyProbeFormValues): LatencyProbeOptions {
  return {
    intervalMs: form.intervalSeconds * 1_000,
    durationMs: form.durationSeconds * 1_000,
    timeoutMs: form.timeoutSeconds * 1_000,
    retryCount: form.retryCount,
    retryDelayMs: form.retryDelayMs,
  };
}

export function applyNormalizedLatencyProbeForm(
  normalized: NormalizedLatencyProbeOptions,
): LatencyProbeFormValues {
  return {
    intervalSeconds: normalized.intervalMs / 1_000,
    durationSeconds: normalized.durationMs / 1_000,
    timeoutSeconds: normalized.timeoutMs / 1_000,
    retryCount: normalized.retryCount,
    retryDelayMs: normalized.retryDelayMs,
  };
}

export function buildLatencyProbeStartPlan(form: LatencyProbeFormValues): {
  form: LatencyProbeFormValues;
  options: NormalizedLatencyProbeOptions;
} {
  const options = normalizeLatencyProbeOptions(latencyProbeFormToOptions(form));
  return {
    form: applyNormalizedLatencyProbeForm(options),
    options,
  };
}
