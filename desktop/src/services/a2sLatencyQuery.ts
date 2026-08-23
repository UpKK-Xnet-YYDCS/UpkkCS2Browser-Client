import type {
  LocalLatencyQuery,
  LocalLatencySnapshot,
  LocalLatencyTarget,
} from './a2sLatencyTypes.ts';

export async function queryLatencyWithRetry(options: {
  query: LocalLatencyQuery;
  target: LocalLatencyTarget;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}): Promise<LocalLatencySnapshot> {
  let lastError = 'A2S latency unavailable';
  const attempts = options.retryCount + 1;
  try {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const result = await options.query(options.target.ip, options.target.port, { timeoutMs: options.timeoutMs });
        if (result.success && Number.isFinite(result.latency_ms)) {
          return {
            status: 'success',
            latencyMs: Math.max(0, Math.round(result.latency_ms ?? 0)),
            updatedAt: options.now(),
          };
        }
        lastError = result.error || 'A2S latency unavailable';
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (attempt < attempts - 1 && options.retryDelayMs > 0) {
        await options.sleep(options.retryDelayMs);
      }
    }
    return {
      status: 'failed',
      error: lastError,
      updatedAt: options.now(),
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      updatedAt: options.now(),
    };
  }
}
