import type { LocalLatencyQuery, LocalLatencyQueryResult } from './a2sLatency';

export interface LatencyProbeTarget {
  ip: string;
  port: string;
}

export interface LatencyProbeOptions {
  intervalMs?: number;
  durationMs?: number;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

export interface NormalizedLatencyProbeOptions {
  intervalMs: number;
  durationMs: number;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
}

export type LatencyProbeSampleStatus = 'success' | 'failed';

export interface LatencyProbeSample {
  sequence: number;
  startedAt: number;
  completedAt: number;
  status: LatencyProbeSampleStatus;
  latencyMs?: number;
  error?: string;
}

export interface LatencyProbeMetrics {
  sent: number;
  received: number;
  lost: number;
  packetLossPercent: number;
  minLatencyMs?: number;
  avgLatencyMs?: number;
  maxLatencyMs?: number;
  rttStabilityMs?: number;
}

export interface LatencyProbeSummary {
  samples: LatencyProbeSample[];
  metrics: LatencyProbeMetrics;
}

export interface LatencyProbeSeriesPoint {
  sequence: number;
  startedAt: number;
  status: LatencyProbeSampleStatus;
  latencyMs?: number;
  packetLossPercent: number;
  rttStabilityMs?: number;
  error?: string;
}

export interface LatencyProbeSession {
  start: () => Promise<LatencyProbeSummary>;
  stop: () => void;
}

interface CreateLatencyProbeSessionOptions {
  target: LatencyProbeTarget;
  options?: LatencyProbeOptions;
  query: LocalLatencyQuery;
  onSample?: (sample: LatencyProbeSample, summary: LatencyProbeSummary) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_OPTIONS: NormalizedLatencyProbeOptions = {
  intervalMs: 1_000,
  durationMs: 120_000,
  timeoutMs: 3_000,
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

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
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

export function getLatencyProbeMetrics(samples: LatencyProbeSample[]): LatencyProbeMetrics {
  const sent = samples.length;
  const successSamples = samples.filter(sample => sample.status === 'success' && Number.isFinite(sample.latencyMs));
  const received = successSamples.length;
  const lost = sent - received;
  const latencies = successSamples.map(sample => Math.max(0, sample.latencyMs ?? 0));
  const avg = latencies.length > 0 ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : undefined;
  const variance = avg === undefined
    ? undefined
    : latencies.reduce((sum, value) => sum + (value - avg) ** 2, 0) / latencies.length;

  return {
    sent,
    received,
    lost,
    packetLossPercent: sent > 0 ? roundMetric((lost / sent) * 100) : 0,
    minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : undefined,
    avgLatencyMs: avg === undefined ? undefined : roundMetric(avg),
    maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : undefined,
    rttStabilityMs: variance === undefined ? undefined : roundMetric(Math.sqrt(variance)),
  };
}

export function getLatencyProbeSeries(samples: LatencyProbeSample[]): LatencyProbeSeriesPoint[] {
  return samples.map((sample, index) => {
    const metrics = getLatencyProbeMetrics(samples.slice(0, index + 1));
    const latencyMs = sample.status === 'success' && Number.isFinite(sample.latencyMs)
      ? Math.max(0, Math.round(sample.latencyMs ?? 0))
      : undefined;

    return {
      sequence: sample.sequence,
      startedAt: sample.startedAt,
      status: sample.status,
      latencyMs,
      packetLossPercent: metrics.packetLossPercent,
      rttStabilityMs: metrics.rttStabilityMs,
      error: sample.error,
    };
  });
}

async function queryWithRetries(
  query: LocalLatencyQuery,
  target: LatencyProbeTarget,
  options: NormalizedLatencyProbeOptions,
  sleep: (ms: number) => Promise<void>,
): Promise<LocalLatencyQueryResult> {
  let lastResult: LocalLatencyQueryResult = { success: false, error: 'A2S latency unavailable' };
  for (let attempt = 0; attempt <= options.retryCount; attempt += 1) {
    try {
      const result = await query(target.ip, target.port, { timeoutMs: options.timeoutMs });
      if (result.success && Number.isFinite(result.latency_ms)) {
        return result;
      }
      lastResult = {
        success: false,
        error: result.error || 'A2S latency unavailable',
      };
    } catch (error) {
      lastResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    if (attempt < options.retryCount && options.retryDelayMs > 0) {
      await sleep(options.retryDelayMs);
    }
  }
  return lastResult;
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
      const result = await queryWithRetries(query, target, normalized, sleep);
      const completedAt = now();
      const sample: LatencyProbeSample = result.success && Number.isFinite(result.latency_ms)
        ? {
          sequence: index + 1,
          startedAt,
          completedAt,
          status: 'success',
          latencyMs: Math.max(0, Math.round(result.latency_ms ?? 0)),
        }
        : {
          sequence: index + 1,
          startedAt,
          completedAt,
          status: 'failed',
          error: result.error || 'A2S latency unavailable',
        };

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
