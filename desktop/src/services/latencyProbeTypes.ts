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

export interface LatencyProbeAttempt {
  sequence: number;
  attempt: number;
  startedAt: number;
  completedAt: number;
  status: LatencyProbeSampleStatus;
  elapsedMs: number;
  latencyMs?: number;
  error?: string;
}

export interface LatencyProbeSample {
  sequence: number;
  startedAt: number;
  completedAt: number;
  status: LatencyProbeSampleStatus;
  observedLatencyMs: number;
  attempts: LatencyProbeAttempt[];
  latencyMs?: number;
  error?: string;
}

export interface LatencyProbeMetrics {
  sent: number;
  received: number;
  lost: number;
  packetLossPercent: number;
  attempts: number;
  failedAttempts: number;
  attemptLossPercent: number;
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

