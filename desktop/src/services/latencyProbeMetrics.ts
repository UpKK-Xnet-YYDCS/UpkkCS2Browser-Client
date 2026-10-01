import type {
  LatencyProbeMetrics,
  LatencyProbeOptions,
  LatencyProbeSample,
  LatencyProbeSeriesPoint,
  NormalizedLatencyProbeOptions,
} from './latencyProbeTypes.ts';

const DEFAULT_OPTIONS: NormalizedLatencyProbeOptions = {
  intervalMs: 1_000,
  durationMs: 120_000,
  timeoutMs: 2_000,
  retryCount: 1,
  retryDelayMs: 300,
};

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeLatencyProbeOptions(options: LatencyProbeOptions = {}): NormalizedLatencyProbeOptions {
  return {
    intervalMs: clampNumber(options.intervalMs, DEFAULT_OPTIONS.intervalMs, 1_000, 60_000),
    durationMs: clampNumber(options.durationMs, DEFAULT_OPTIONS.durationMs, 5_000, 30 * 60_000),
    timeoutMs: clampNumber(options.timeoutMs, DEFAULT_OPTIONS.timeoutMs, 500, 5_000),
    retryCount: clampNumber(options.retryCount, DEFAULT_OPTIONS.retryCount, 0, 5),
    retryDelayMs: clampNumber(options.retryDelayMs, DEFAULT_OPTIONS.retryDelayMs, 0, 3_000),
  };
}

function observedLatencyOf(sample: LatencyProbeSample): number {
  if (Number.isFinite(sample.observedLatencyMs)) {
    return Math.max(0, sample.observedLatencyMs);
  }
  if (sample.status === 'success' && Number.isFinite(sample.latencyMs)) {
    return Math.max(0, sample.latencyMs ?? 0);
  }
  return Math.max(0, sample.completedAt - sample.startedAt);
}

export function getLatencyProbeMetrics(samples: LatencyProbeSample[]): LatencyProbeMetrics {
  const sent = samples.length;
  const successSamples = samples.filter(sample => sample.status === 'success' && Number.isFinite(sample.latencyMs));
  const received = successSamples.length;
  const lost = sent - received;
  const latencies = successSamples.map(sample => Math.max(0, sample.latencyMs ?? 0));
  const attempts = samples.flatMap(sample => sample.attempts ?? []);
  const failedAttempts = attempts.filter(attempt => attempt.status === 'failed').length;
  const observedLatencies = samples
    .map(observedLatencyOf)
    .filter(value => Number.isFinite(value));
  const avg = latencies.length > 0 ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : undefined;
  const observedAvg = observedLatencies.length > 0
    ? observedLatencies.reduce((sum, value) => sum + value, 0) / observedLatencies.length
    : undefined;
  const variance = observedAvg === undefined
    ? undefined
    : observedLatencies.reduce((sum, value) => sum + (value - observedAvg) ** 2, 0) / observedLatencies.length;

  return {
    sent,
    received,
    lost,
    packetLossPercent: sent > 0 ? roundMetric((lost / sent) * 100) : 0,
    attempts: attempts.length,
    failedAttempts,
    attemptLossPercent: attempts.length > 0 ? roundMetric((failedAttempts / attempts.length) * 100) : 0,
    minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : undefined,
    avgLatencyMs: avg === undefined ? undefined : roundMetric(avg),
    maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : undefined,
    rttStabilityMs: variance === undefined ? undefined : roundMetric(Math.sqrt(variance)),
  };
}

/**
 * Per-point RTT stability is a two-pass deviation around each prefix's own mean,
 * so it cannot be updated in O(1) without changing its rounding. The chart
 * recomputes the whole series on every new sample, so already-computed points
 * are memoized instead. Capacity: one series (the latest input), at most
 * MAX_MEMOIZED_SERIES_POINTS points. No TTL: every call re-derives each
 * sample's observed latency and reuses a point only while the entire prefix up
 * to it still matches, so a different or edited input is recomputed.
 */
export const MAX_MEMOIZED_SERIES_POINTS = 2_048;
let memoObserved: number[] = [];
let memoStability: Array<number | undefined> = [];

export function resetLatencyProbeSeriesMemo(): void {
  memoObserved = [];
  memoStability = [];
}

function prefixStability(finiteObserved: number[], observedSum: number): number | undefined {
  if (finiteObserved.length === 0) return undefined;
  const observedAvg = observedSum / finiteObserved.length;
  let squaredDeviation = 0;
  for (const value of finiteObserved) squaredDeviation += (value - observedAvg) ** 2;
  return roundMetric(Math.sqrt(squaredDeviation / finiteObserved.length));
}

export function getLatencyProbeSeries(samples: LatencyProbeSample[]): LatencyProbeSeriesPoint[] {
  const finiteObserved: number[] = [];
  let observedSum = 0;
  let received = 0;
  let prefixMatchesMemo = true;

  const points = samples.map((sample, index) => {
    const success = sample.status === 'success' && Number.isFinite(sample.latencyMs);
    if (success) received += 1;
    const observed = observedLatencyOf(sample);
    if (Number.isFinite(observed)) {
      finiteObserved.push(observed);
      observedSum += observed;
    }

    prefixMatchesMemo = prefixMatchesMemo
      && index < memoObserved.length
      && Object.is(memoObserved[index], observed);
    let rttStabilityMs: number | undefined;
    if (prefixMatchesMemo) {
      rttStabilityMs = memoStability[index];
    } else {
      rttStabilityMs = prefixStability(finiteObserved, observedSum);
      if (index < MAX_MEMOIZED_SERIES_POINTS) {
        memoObserved[index] = observed;
        memoStability[index] = rttStabilityMs;
      }
    }

    const sent = index + 1;
    const lost = sent - received;
    const latencyMs = success ? Math.max(0, Math.round(sample.latencyMs ?? 0)) : undefined;

    return {
      sequence: sample.sequence,
      startedAt: sample.startedAt,
      status: sample.status,
      latencyMs,
      packetLossPercent: roundMetric((lost / sent) * 100),
      rttStabilityMs,
      error: sample.error,
    };
  });

  const memoLength = Math.min(samples.length, MAX_MEMOIZED_SERIES_POINTS);
  memoObserved.length = memoLength;
  memoStability.length = memoLength;
  return points;
}
