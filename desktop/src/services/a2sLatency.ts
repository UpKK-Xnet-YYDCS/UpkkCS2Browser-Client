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
  identity: string;
  address: string;
  target: LocalLatencyTarget;
  priority: number;
  fresh: boolean;
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

  function probeIdentity(address: string, fresh: boolean): string {
    return address + '|t' + String(timeoutMs) + (fresh ? '|fresh' : '|ttl');
  }

  function cancelledSnapshot(): LocalLatencySnapshot {
    return { status: 'failed', error: 'Cancelled', updatedAt: now() };
  }

  function dropQueuedProbe(probe: LatencyProbe, snapshot: LocalLatencySnapshot): void {
    inFlight.delete(probe.identity);
    const index = queue.indexOf(probe);
    if (index >= 0) queue.splice(index, 1);
    probe.listeners = [];
    probe.resolve(snapshot);
  }

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
        inFlight.delete(probe.identity);
        pumpQueue();
      });
    }
  }

  function enqueue(job: LatencyJob, onUpdate: LocalLatencyUpdate, fresh: boolean): Promise<LocalLatencySnapshot> {
    const identity = probeIdentity(job.address, fresh);
    const existing = inFlight.get(identity);
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
      identity,
      address: job.address,
      target: job.target,
      priority: job.priority,
      fresh,
      listeners: [{ keys: job.keys, onUpdate }],
      started: false,
      promise,
      resolve: resolveProbe,
    };
    inFlight.set(identity, probe);
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
    const superseded: LocalLatencySnapshot = {
      status: 'failed',
      error: 'Superseded by newer latency batch',
      updatedAt: now(),
    };
    const queuedByIdentity = new Map(queue.map(probe => [probe.identity, probe]));

    for (const probe of [...queue]) {
      if (!currentAddresses.has(probe.address)) {
        dropQueuedProbe(probe, superseded);
      }
    }

    queue.length = 0;
    for (const address of prioritizedAddresses) {
      const probe = queuedByIdentity.get(probeIdentity(address, false))
        ?? queuedByIdentity.get(probeIdentity(address, true));
      if (probe && !probe.started && inFlight.get(probe.identity) === probe) {
        queue.push(probe);
      }
    }
  }

  async function measure(targets: LocalLatencyTarget[], onUpdate: LocalLatencyUpdate, measureOptions: LocalLatencyMeasureOptions = {}): Promise<void> {
    const fresh = measureOptions.mode === 'realtime';
    const shouldReplacePending = measureOptions.mode !== 'background' && !fresh;

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
      if (!fresh && cached?.updatedAt && currentTime - cached.updatedAt < ttlMs) {
        updateKeys(job.keys, cached, onUpdate);
        continue;
      }
      jobs.push(enqueue(job, onUpdate, fresh));
    }

    await Promise.all(jobs);
  }

  function cancelListener(onUpdate: LocalLatencyUpdate): void {
    const cancelled = cancelledSnapshot();
    for (const probe of [...inFlight.values()]) {
      probe.listeners = probe.listeners.filter(listener => listener.onUpdate !== onUpdate);
      if (probe.started || probe.listeners.length > 0) continue;
      dropQueuedProbe(probe, cancelled);
    }
  }

  function cancelPending(): void {
    const cancelled = cancelledSnapshot();
    for (const probe of [...queue]) {
      dropQueuedProbe(probe, cancelled);
    }
  }

  function release(): void {
    cancelPending();
    for (const probe of inFlight.values()) {
      probe.listeners = [];
    }
    cache.clear();
  }

  return {
    measure,
    clearCache: () => cache.clear(),
    cancelListener,
    cancelPending,
    release,
  };
}
