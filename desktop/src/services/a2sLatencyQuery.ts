import type {
  LocalLatencyBatchQuery,
  LocalLatencyQuery,
  LocalLatencyQueryResult,
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

function latencySnapshotFromResult(
  result: LocalLatencyQueryResult | undefined,
  now: number,
): { snapshot: LocalLatencySnapshot; ok: boolean } {
  if (result?.success && Number.isFinite(result.latency_ms)) {
    return {
      ok: true,
      snapshot: {
        status: 'success',
        latencyMs: Math.max(0, Math.round(result.latency_ms ?? 0)),
        updatedAt: now,
      },
    };
  }
  return {
    ok: false,
    snapshot: {
      status: 'failed',
      error: result?.error || 'A2S latency unavailable',
      updatedAt: now,
    },
  };
}

export async function queryLatencyBatchWithRetry(options: {
  query: LocalLatencyQuery;
  queryBatch: LocalLatencyBatchQuery;
  targets: LocalLatencyTarget[];
  timeoutMs: number;
  concurrency: number;
  retryCount: number;
  retryDelayMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}): Promise<LocalLatencySnapshot[]> {
  const snapshots: LocalLatencySnapshot[] = options.targets.map(() => ({
    status: 'failed',
    error: 'A2S latency unavailable',
    updatedAt: options.now(),
  }));
  let pending = options.targets.map((target, index) => ({ target, index }));
  const attempts = options.retryCount + 1;

  for (let attempt = 0; attempt < attempts && pending.length > 0; attempt += 1) {
    if (pending.length === 1) {
      const only = pending[0];
      snapshots[only.index] = await queryLatencyWithRetry({
        query: options.query,
        target: only.target,
        timeoutMs: options.timeoutMs,
        retryCount: Math.max(0, options.retryCount - attempt),
        retryDelayMs: options.retryDelayMs,
        now: options.now,
        sleep: options.sleep,
      });
      break;
    }

    let results: LocalLatencyQueryResult[];
    try {
      results = await options.queryBatch(
        pending.map(item => ({ ip: item.target.ip, port: item.target.port })),
        { timeoutMs: options.timeoutMs, concurrency: options.concurrency },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results = pending.map(() => ({ success: false, error: message }));
    }

    const stillPending: Array<{ target: LocalLatencyTarget; index: number }> = [];
    for (let index = 0; index < pending.length; index += 1) {
      const item = pending[index];
      const resolved = latencySnapshotFromResult(results[index], options.now());
      snapshots[item.index] = resolved.snapshot;
      if (!resolved.ok) stillPending.push(item);
    }
    pending = stillPending;
    if (pending.length > 0 && attempt < attempts - 1 && options.retryDelayMs > 0) {
      await options.sleep(options.retryDelayMs);
    }
  }

  return snapshots;
}
