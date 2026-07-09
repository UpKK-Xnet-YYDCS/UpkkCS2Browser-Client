export type LocalLatencyStatus = 'queued' | 'checking' | 'success' | 'failed' | 'unavailable';

export interface LocalLatencyTarget {
  key: string;
  ip: string;
  port: string;
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

interface LocalLatencySchedulerOptions {
  query: LocalLatencyQuery;
  concurrency?: number;
  ttlMs?: number;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  replacePending?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  isAvailable?: () => boolean;
}

export interface LocalLatencyScheduler {
  measure: (targets: LocalLatencyTarget[], onUpdate: LocalLatencyUpdate, options?: LocalLatencyMeasureOptions) => Promise<void>;
  clearCache: () => void;
}

interface LatencyJob {
  address: string;
  target: LocalLatencyTarget;
  keys: string[];
}

interface LatencyListener {
  keys: string[];
  onUpdate: LocalLatencyUpdate;
}

interface LatencyProbe {
  address: string;
  target: LocalLatencyTarget;
  listeners: LatencyListener[];
  started: boolean;
  promise: Promise<LocalLatencySnapshot>;
  resolve: (snapshot: LocalLatencySnapshot) => void;
}

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_RETRY_DELAY_MS = 300;

function normalizeConcurrency(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_CONCURRENCY;
  return Math.max(1, Math.min(6, Math.floor(value)));
}

function normalizeTimeoutMs(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_TIMEOUT_MS;
  return Math.max(500, Math.min(5_000, Math.floor(value)));
}

function normalizeRetryCount(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_RETRY_COUNT;
  return Math.max(0, Math.min(5, Math.floor(value)));
}

function normalizeRetryDelayMs(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_RETRY_DELAY_MS;
  return Math.max(0, Math.min(3_000, Math.floor(value)));
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => globalThis.setTimeout(resolve, ms));
}

function addressKey(ip: string, port: string): string {
  return `${ip.trim()}:${String(port).trim()}`;
}

function updateKeys(keys: string[], snapshot: LocalLatencySnapshot, onUpdate: LocalLatencyUpdate): void {
  for (const key of keys) {
    onUpdate(key, snapshot);
  }
}

export function createLocalLatencyScheduler(options: LocalLatencySchedulerOptions): LocalLatencyScheduler {
  const concurrency = normalizeConcurrency(options.concurrency);
  const ttlMs = Math.max(1_000, options.ttlMs ?? DEFAULT_TTL_MS);
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
  const retryCount = normalizeRetryCount(options.retryCount);
  const retryDelayMs = normalizeRetryDelayMs(options.retryDelayMs);
  const replacePending = options.replacePending ?? true;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const isAvailable = options.isAvailable ?? (() => true);
  const cache = new Map<string, LocalLatencySnapshot>();
  const inFlight = new Map<string, LatencyProbe>();
  const queue: LatencyProbe[] = [];
  let activeCount = 0;

  function notify(probe: LatencyProbe, snapshot: LocalLatencySnapshot): void {
    for (const listener of probe.listeners) {
      updateKeys(listener.keys, snapshot, listener.onUpdate);
    }
  }

  async function queryJob(job: LatencyJob): Promise<LocalLatencySnapshot> {
    let lastError = 'A2S latency unavailable';
    const attempts = retryCount + 1;
    try {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const result = await options.query(job.target.ip, job.target.port, { timeoutMs });
          if (result.success && Number.isFinite(result.latency_ms)) {
            return {
              status: 'success',
              latencyMs: Math.max(0, Math.round(result.latency_ms ?? 0)),
              updatedAt: now(),
            };
          }
          lastError = result.error || 'A2S latency unavailable';
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
        if (attempt < attempts - 1 && retryDelayMs > 0) {
          await sleep(retryDelayMs);
        }
      }
      return {
        status: 'failed',
        error: lastError,
        updatedAt: now(),
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        updatedAt: now(),
      };
    }
  }

  function pumpQueue(): void {
    while (activeCount < concurrency && queue.length > 0) {
      const probe = queue.shift();
      if (!probe) return;

      activeCount += 1;
      probe.started = true;
      notify(probe, { status: 'checking' });

      void queryJob({
        address: probe.address,
        target: probe.target,
        keys: [],
      }).then(snapshot => {
        cache.set(probe.address, snapshot);
        notify(probe, snapshot);
        probe.resolve(snapshot);
      }).finally(() => {
        activeCount -= 1;
        inFlight.delete(probe.address);
        pumpQueue();
      });
    }
  }

  function enqueue(job: LatencyJob, onUpdate: LocalLatencyUpdate): Promise<LocalLatencySnapshot> {
    const existing = inFlight.get(job.address);
    if (existing) {
      existing.listeners.push({ keys: job.keys, onUpdate });
      updateKeys(job.keys, { status: existing.started ? 'checking' : 'queued' }, onUpdate);
      return existing.promise;
    }

    let resolveProbe: (snapshot: LocalLatencySnapshot) => void = () => undefined;
    const promise = new Promise<LocalLatencySnapshot>(resolve => {
      resolveProbe = resolve;
    });
    const probe: LatencyProbe = {
      address: job.address,
      target: job.target,
      listeners: [{ keys: job.keys, onUpdate }],
      started: false,
      promise,
      resolve: resolveProbe,
    };
    inFlight.set(job.address, probe);
    updateKeys(job.keys, { status: 'queued' }, onUpdate);
    queue.push(probe);
    pumpQueue();
    return promise;
  }

  function prioritizeCurrentBatch(grouped: Map<string, LatencyJob>): void {
    if (!replacePending || queue.length === 0) return;

    const currentAddresses = new Set(grouped.keys());
    const queuedByAddress = new Map(queue.map(probe => [probe.address, probe]));
    const superseded: LocalLatencySnapshot = {
      status: 'failed',
      error: 'Superseded by newer latency batch',
      updatedAt: now(),
    };

    for (const probe of queue) {
      if (!currentAddresses.has(probe.address)) {
        inFlight.delete(probe.address);
        probe.resolve(superseded);
      }
    }

    queue.length = 0;
    for (const address of currentAddresses) {
      const probe = queuedByAddress.get(address);
      if (probe && !probe.started && inFlight.get(address) === probe) {
        queue.push(probe);
      }
    }
  }

  async function measure(targets: LocalLatencyTarget[], onUpdate: LocalLatencyUpdate, measureOptions: LocalLatencyMeasureOptions = {}): Promise<void> {
    const shouldReplacePending = measureOptions.mode !== 'background';

    if (targets.length === 0) {
      if (shouldReplacePending) {
        prioritizeCurrentBatch(new Map());
      }
      return;
    }

    if (!isAvailable()) {
      for (const target of targets) {
        onUpdate(target.key, { status: 'unavailable' });
      }
      return;
    }

    const grouped = new Map<string, LatencyJob>();
    for (const target of targets) {
      const address = addressKey(target.ip, target.port);
      if (!address || address === ':') continue;
      const existing = grouped.get(address);
      if (existing) {
        existing.keys.push(target.key);
      } else {
        grouped.set(address, {
          address,
          target,
          keys: [target.key],
        });
      }
    }

    if (shouldReplacePending) {
      prioritizeCurrentBatch(grouped);
    }

    const jobs: Array<Promise<LocalLatencySnapshot>> = [];
    const currentTime = now();
    for (const job of grouped.values()) {
      const cached = cache.get(job.address);
      if (cached?.updatedAt && currentTime - cached.updatedAt < ttlMs) {
        updateKeys(job.keys, cached, onUpdate);
        continue;
      }
      jobs.push(enqueue(job, onUpdate));
    }

    await Promise.all(jobs);
  }

  return {
    measure,
    clearCache: () => cache.clear(),
  };
}
