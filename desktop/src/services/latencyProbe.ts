import type { LocalLatencyQuery } from './a2sLatency.ts';
import { getLatencyProbeMetrics, normalizeLatencyProbeOptions } from './latencyProbeMetrics.ts';
import { buildLatencyProbeAttempt, buildLatencyProbeSample } from './latencyProbeSample.ts';
import type {
  LatencyProbeAttempt,
  LatencyProbeOptions,
  LatencyProbeSample,
  LatencyProbeSession,
  LatencyProbeSummary,
  LatencyProbeTarget,
  NormalizedLatencyProbeOptions,
} from './latencyProbeTypes.ts';

export type {
  LatencyProbeAttempt,
  LatencyProbeMetrics,
  LatencyProbeOptions,
  LatencyProbeSample,
  LatencyProbeSampleStatus,
  LatencyProbeSeriesPoint,
  LatencyProbeSession,
  LatencyProbeSummary,
  LatencyProbeTarget,
  NormalizedLatencyProbeOptions,
} from './latencyProbeTypes.ts';
export { getLatencyProbeMetrics, getLatencyProbeSeries, normalizeLatencyProbeOptions } from './latencyProbeMetrics.ts';
export { buildLatencyProbeAttempt, buildLatencyProbeSample } from './latencyProbeSample.ts';

interface CreateLatencyProbeSessionOptions {
  target: LatencyProbeTarget;
  options?: LatencyProbeOptions;
  query: LocalLatencyQuery;
  onSample?: (sample: LatencyProbeSample, summary: LatencyProbeSummary) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function queryWithRetries(
  query: LocalLatencyQuery,
  target: LatencyProbeTarget,
  options: NormalizedLatencyProbeOptions,
  sleep: (ms: number) => Promise<void>,
  now: () => number,
  sequence: number,
): Promise<{ result: Awaited<ReturnType<LocalLatencyQuery>>; attempts: LatencyProbeAttempt[] }> {
  let lastResult: Awaited<ReturnType<LocalLatencyQuery>> = { success: false, error: 'A2S latency unavailable' };
  const attempts: LatencyProbeAttempt[] = [];
  for (let attempt = 0; attempt <= options.retryCount; attempt += 1) {
    const startedAt = now();
    try {
      const result = await query(target.ip, target.port, { timeoutMs: options.timeoutMs });
      const completedAt = now();
      if (result.success && Number.isFinite(result.latency_ms)) {
        attempts.push(buildLatencyProbeAttempt({
          sequence,
          attempt: attempt + 1,
          startedAt,
          completedAt,
          status: 'success',
          latencyMs: result.latency_ms,
        }));
        return { result, attempts };
      }
      lastResult = {
        success: false,
        error: result.error || 'A2S latency unavailable',
      };
      attempts.push(buildLatencyProbeAttempt({
        sequence,
        attempt: attempt + 1,
        startedAt,
        completedAt,
        status: 'failed',
        error: lastResult.error,
      }));
    } catch (error) {
      const completedAt = now();
      lastResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      attempts.push(buildLatencyProbeAttempt({
        sequence,
        attempt: attempt + 1,
        startedAt,
        completedAt,
        status: 'failed',
        error: lastResult.error,
      }));
    }
    if (attempt < options.retryCount && options.retryDelayMs > 0) {
      await sleep(options.retryDelayMs);
    }
  }
  return { result: lastResult, attempts };
}

export function createLatencyProbeSession({
  target,
  options,
  query,
  onSample,
  now = () => Date.now(),
  sleep = defaultSleep,
}: CreateLatencyProbeSessionOptions): LatencyProbeSession {
  const normalized = normalizeLatencyProbeOptions(options);
  const samples: LatencyProbeSample[] = [];
  let stopped = false;

  async function start(): Promise<LatencyProbeSummary> {
    const sessionStartedAt = now();
    const plannedSamples = Math.max(1, Math.floor(normalized.durationMs / normalized.intervalMs) + 1);

    for (let index = 0; index < plannedSamples && !stopped; index += 1) {
      const scheduledAt = sessionStartedAt + index * normalized.intervalMs;
      const waitMs = scheduledAt - now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      if (stopped) break;

      const startedAt = now();
      const { result, attempts } = await queryWithRetries(query, target, normalized, sleep, now, index + 1);
      const completedAt = now();
      const sample = buildLatencyProbeSample(index + 1, startedAt, completedAt, result, attempts);

      samples.push(sample);
      onSample?.(sample, {
        samples: [...samples],
        metrics: getLatencyProbeMetrics(samples),
      });
    }

    return {
      samples: [...samples],
      metrics: getLatencyProbeMetrics(samples),
    };
  }

  return {
    start,
    stop: () => {
      stopped = true;
    },
  };
}
