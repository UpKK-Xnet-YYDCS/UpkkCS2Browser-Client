export type LocalLatencyStatus = 'queued' | 'checking' | 'success' | 'failed' | 'unavailable';

export interface LocalLatencyTarget {
  key: string;
  ip: string;
  port: string;
  priority?: number;
}

export interface LocalLatencySnapshot {
  status: LocalLatencyStatus;
  latencyMs?: number;
  error?: string;
  updatedAt?: number;
}

export interface LocalLatencyQueryOptions {
  timeoutMs: number;
}

export interface LocalLatencyQueryResult {
  success: boolean;
  latency_ms?: number;
  error?: string;
}

export type LocalLatencyQuery = (
  ip: string,
  port: string,
  options: LocalLatencyQueryOptions,
) => Promise<LocalLatencyQueryResult>;

export type LocalLatencyUpdate = (key: string, snapshot: LocalLatencySnapshot) => void;

export interface LocalLatencyMeasureOptions {
  mode?: 'replace' | 'background';
}

export interface LocalLatencyScheduler {
  measure: (targets: LocalLatencyTarget[], onUpdate: LocalLatencyUpdate, options?: LocalLatencyMeasureOptions) => Promise<void>;
  clearCache: () => void;
}

export interface GroupedLatencyJob {
  address: string;
  target: LocalLatencyTarget;
  keys: string[];
  priority: number;
}

