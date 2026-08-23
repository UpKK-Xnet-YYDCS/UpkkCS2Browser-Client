import { BoundedLruMap } from './boundedLru.ts';
import {
  DEFAULT_LATENCY_TTL_MS,
  groupLatencyTargets,
  normalizeLatencyConcurrency,
  normalizeLatencyRetryCount,
  normalizeLatencyRetryDelayMs,
  normalizeLatencyTimeoutMs,
} from './a2sLatencyPolicy.ts';
import { queryLatencyWithRetry } from './a2sLatencyQuery.ts';
import type {
  GroupedLatencyJob,
  LocalLatencyMeasureOptions,
  LocalLatencyQuery,
  LocalLatencyScheduler,
  LocalLatencySnapshot,
  LocalLatencyTarget,
  LocalLatencyUpdate,
} from './a2sLatencyTypes.ts';

export type {
  LocalLatencyMeasureOptions,
  LocalLatencyQuery,
  LocalLatencyQueryOptions,
  LocalLatencyQueryResult,
  LocalLatencyScheduler,
  LocalLatencySnapshot,
  LocalLatencyStatus,
  LocalLatencyTarget,
  LocalLatencyUpdate,
} from './a2sLatencyTypes.ts';

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


type LatencyJob = GroupedLatencyJob;

interface LatencyListener {
  keys: string[];
  onUpdate: LocalLatencyUpdate;
}

interface LatencyProbe {
  address: string;
  target: LocalLatencyTarget;
  priority: number;
  listeners: LatencyListener[];
  started: boolean;
  promise: Promise<LocalLatencySnapshot>;
  resolve: (snapshot: LocalLatencySnapshot) => void;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => globalThis.setTimeout(resolve, ms));
}


function updateKeys(keys: string[], snapshot: LocalLatencySnapshot, onUpdate: LocalLatencyUpdate): void {
  for (const key of keys) {
    onUpdate(key, snapshot);
  }
}

export function createLocalLatencyScheduler(options: LocalLatencySchedulerOptions): LocalLatencyScheduler {
  const concurrency = normalizeLatencyConcurrency(options.concurrency);
  const ttlMs = Math.max(1_000, options.ttlMs ?? DEFAULT_LATENCY_TTL_MS);
  const timeoutMs = normalizeLatencyTimeoutMs(options.timeoutMs);
  const retryCount = normalizeLatencyRetryCount(options.retryCount);
  const retryDelayMs = normalizeLatencyRetryDelayMs(options.retryDelayMs);
  const replacePending = options.replacePending ?? true;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const isAvailable = options.isAvailable ?? (() => true);
  const cache = new BoundedLruMap<string, LocalLatencySnapshot>(512);
  const inFlight = new Map<string, LatencyProbe>();
  const queue: LatencyProbe[] = [];
  let activeCount = 0;

  function notify(probe: LatencyProbe, snapshot: LocalLatencySnapshot): void {
    for (const listener of probe.listeners) {
      updateKeys(listener.keys, snapshot, listener.onUpdate);
    }
  }

  async function queryJob(job: LatencyJob): Promise<LocalLatencySnapshot> {
    return queryLatencyWithRetry({
      query: options.query,
      target: job.target,
      timeoutMs,
      retryCount,
      retryDelayMs,
      now,
      sleep,
    });
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
        priority: probe.priority,
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
      if (!existing.started) {
        existing.priority = Math.min(existing.priority, job.priority);
        queue.sort((a, b) => a.priority - b.priority);
      }
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
      priority: job.priority,
      listeners: [{ keys: job.keys, onUpdate }],
      started: false,
      promise,
      resolve: resolveProbe,
    };
    inFlight.set(job.address, probe);
    updateKeys(job.keys, { status: 'queued' }, onUpdate);
    queue.push(probe);
    queue.sort((a, b) => a.priority - b.priority);
    pumpQueue();
    return promise;
  }

  function prioritizeCurrentBatch(grouped: Map<string, LatencyJob>): void {
    if (!replacePending || queue.length === 0) return;

    const currentAddresses = new Set(grouped.keys());
    const prioritizedAddresses = Array.from(grouped.values())
      .sort((a, b) => a.priority - b.priority)
      .map(job => job.address);
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
    for (const address of prioritizedAddresses) {
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

    const grouped = groupLatencyTargets(targets);

    if (shouldReplacePending) {
      prioritizeCurrentBatch(grouped);
    }

    const jobs: Array<Promise<LocalLatencySnapshot>> = [];
    const currentTime = now();
    const prioritizedJobs = Array.from(grouped.values()).sort((a, b) => a.priority - b.priority);
    for (const job of prioritizedJobs) {
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
