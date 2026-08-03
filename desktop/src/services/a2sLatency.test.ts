import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

import {
  createLocalLatencyScheduler,
  type LocalLatencyTarget,
  type LocalLatencySnapshot,
} from './a2sLatency.ts';

test('limits local A2S latency probes to the configured concurrency and de-duplicates addresses', async () => {
  let running = 0;
  let maxRunning = 0;
  const calls: string[] = [];
  const updates: Array<{ key: string; snapshot: LocalLatencySnapshot }> = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 2,
    ttlMs: 60_000,
    timeoutMs: 1_500,
    isAvailable: () => true,
    query: async (ip, port) => {
      calls.push(`${ip}:${port}`);
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await delay(5);
      running -= 1;
      return {
        success: true,
        latency_ms: Number(port) - 27000,
      };
    },
  });

  const targets: LocalLatencyTarget[] = [
    { key: 'one', ip: '10.0.0.1', port: '27011' },
    { key: 'two', ip: '10.0.0.2', port: '27012' },
    { key: 'three', ip: '10.0.0.3', port: '27013' },
    { key: 'duplicate-one', ip: '10.0.0.1', port: '27011' },
  ];

  await scheduler.measure(targets, (key, snapshot) => {
    updates.push({ key, snapshot });
  });

  assert.equal(maxRunning, 2);
  assert.deepEqual(calls.sort(), ['10.0.0.1:27011', '10.0.0.2:27012', '10.0.0.3:27013']);
  assert.equal(updates.find((update) => update.key === 'one' && update.snapshot.status === 'success')?.snapshot.latencyMs, 11);
  assert.equal(updates.find((update) => update.key === 'duplicate-one' && update.snapshot.status === 'success')?.snapshot.latencyMs, 11);
});

test('uses three workers and a 2000ms timeout by default', async () => {
  let running = 0;
  let maxRunning = 0;
  const timeouts: number[] = [];

  const scheduler = createLocalLatencyScheduler({
    isAvailable: () => true,
    query: async (_ip, _port, options) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      timeouts.push(options.timeoutMs);
      await delay(5);
      running -= 1;
      return { success: true, latency_ms: 25 };
    },
  });

  await scheduler.measure([
    { key: 'one', ip: '10.0.2.1', port: '27015' },
    { key: 'two', ip: '10.0.2.2', port: '27015' },
    { key: 'three', ip: '10.0.2.3', port: '27015' },
    { key: 'four', ip: '10.0.2.4', port: '27015' },
  ], () => undefined);

  assert.equal(maxRunning, 3);
  assert.deepEqual(timeouts, [2_000, 2_000, 2_000, 2_000]);
});

test('runs lower-priority offline latency probes after online targets', async () => {
  const calls: string[] = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 1,
    isAvailable: () => true,
    query: async (ip) => {
      calls.push(ip);
      return { success: true, latency_ms: Number(ip.split('.').at(-1)) };
    },
  });

  await scheduler.measure([
    { key: 'offline-one', ip: '10.0.8.1', port: '27015', priority: 1 },
    { key: 'online-two', ip: '10.0.8.2', port: '27015', priority: 0 },
    { key: 'online-three', ip: '10.0.8.3', port: '27015', priority: 0 },
    { key: 'offline-four', ip: '10.0.8.4', port: '27015', priority: 1 },
  ], () => undefined);

  assert.deepEqual(calls, ['10.0.8.2', '10.0.8.3', '10.0.8.1', '10.0.8.4']);
});

test('retries failed latency probes once by default, waits before retry, and stops after success', async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const updates: LocalLatencySnapshot[] = [];

  const scheduler = createLocalLatencyScheduler({
    isAvailable: () => true,
    sleep: async ms => {
      sleeps.push(ms);
    },
    query: async () => {
      calls += 1;
      if (calls === 1) {
        return { success: false, error: 'timeout' };
      }
      return { success: true, latency_ms: 44 };
    },
  });

  await scheduler.measure([{ key: 'retry', ip: '10.0.2.5', port: '27015' }], (_key, snapshot) => {
    updates.push(snapshot);
  });

  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [300]);
  assert.equal(updates.some(snapshot => snapshot.status === 'failed'), false);
  assert.equal(updates.at(-1)?.status, 'success');
  assert.equal(updates.at(-1)?.latencyMs, 44);
});

test('honors configured retry count and retry delay for failed latency probes', async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const updates: LocalLatencySnapshot[] = [];

  const scheduler = createLocalLatencyScheduler({
    retryCount: 2,
    retryDelayMs: 75,
    sleep: async ms => {
      sleeps.push(ms);
    },
    isAvailable: () => true,
    query: async () => {
      calls += 1;
      return { success: false, error: `timeout ${calls}` };
    },
  });

  await scheduler.measure([{ key: 'retry-limit', ip: '10.0.2.6', port: '27015' }], (_key, snapshot) => {
    updates.push(snapshot);
  });

  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [75, 75]);
  assert.equal(updates.at(-1)?.status, 'failed');
  assert.equal(updates.at(-1)?.error, 'timeout 3');
});

test('reuses fresh latency cache entries without issuing another UDP query', async () => {
  let now = 1_000;
  let calls = 0;
  const seen: LocalLatencySnapshot[] = [];

  const scheduler = createLocalLatencyScheduler({
    ttlMs: 60_000,
    now: () => now,
    isAvailable: () => true,
    query: async () => {
      calls += 1;
      return { success: true, latency_ms: 42 };
    },
  });

  const target = { key: 'cached', ip: '10.0.0.4', port: '27015' };

  await scheduler.measure([target], (_key, snapshot) => {
    if (snapshot.status === 'success') seen.push(snapshot);
  });
  now += 10_000;
  await scheduler.measure([target], (_key, snapshot) => {
    if (snapshot.status === 'success') seen.push(snapshot);
  });

  assert.equal(calls, 1);
  assert.deepEqual(seen.map((snapshot) => snapshot.latencyMs), [42, 42]);

  now += 60_001;
  await scheduler.measure([target], (_key, snapshot) => {
    if (snapshot.status === 'success') seen.push(snapshot);
  });
  assert.equal(calls, 2);
  assert.deepEqual(seen.map((snapshot) => snapshot.latencyMs), [42, 42, 42]);
});

test('keeps the concurrency limit across overlapping measurement batches', async () => {
  let running = 0;
  let maxRunning = 0;

  const scheduler = createLocalLatencyScheduler({
    concurrency: 2,
    isAvailable: () => true,
    query: async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await delay(10);
      running -= 1;
      return { success: true, latency_ms: 15 };
    },
  });

  const firstBatch = scheduler.measure([
    { key: 'one', ip: '10.0.1.1', port: '27015' },
    { key: 'two', ip: '10.0.1.2', port: '27015' },
    { key: 'three', ip: '10.0.1.3', port: '27015' },
  ], () => undefined);

  await delay(1);

  const secondBatch = scheduler.measure([
    { key: 'four', ip: '10.0.1.4', port: '27015' },
    { key: 'five', ip: '10.0.1.5', port: '27015' },
  ], () => undefined);

  await Promise.all([firstBatch, secondBatch]);

  assert.equal(maxRunning, 2);
});

test('drops pending probes from older batches so a newer page can run first', async () => {
  let releaseFirst: (() => void) | undefined;
  const calls: string[] = [];
  const firstUpdates: Array<{ key: string; snapshot: LocalLatencySnapshot }> = [];
  const secondUpdates: Array<{ key: string; snapshot: LocalLatencySnapshot }> = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 1,
    isAvailable: () => true,
    query: async (ip) => {
      calls.push(ip);
      if (ip === '10.0.4.1') {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return { success: true, latency_ms: Number(ip.split('.').at(-1)) };
    },
  });

  const firstBatch = scheduler.measure([
    { key: 'old-one', ip: '10.0.4.1', port: '27015' },
    { key: 'old-two', ip: '10.0.4.2', port: '27015' },
    { key: 'old-three', ip: '10.0.4.3', port: '27015' },
  ], (key, snapshot) => {
    firstUpdates.push({ key, snapshot });
  });

  await delay(1);

  const secondBatch = scheduler.measure([
    { key: 'new-four', ip: '10.0.4.4', port: '27015' },
    { key: 'new-five', ip: '10.0.4.5', port: '27015' },
  ], (key, snapshot) => {
    secondUpdates.push({ key, snapshot });
  });

  await delay(1);
  assert.deepEqual(calls, ['10.0.4.1']);

  releaseFirst?.();
  await Promise.all([firstBatch, secondBatch]);

  assert.deepEqual(calls, ['10.0.4.1', '10.0.4.4', '10.0.4.5']);
  assert.equal(firstUpdates.some(update => update.key === 'old-two' && update.snapshot.status === 'success'), false);
  assert.equal(firstUpdates.some(update => update.key === 'old-three' && update.snapshot.status === 'success'), false);
  assert.equal(secondUpdates.some(update => update.key === 'new-four' && update.snapshot.status === 'success'), true);
  assert.equal(secondUpdates.some(update => update.key === 'new-five' && update.snapshot.status === 'success'), true);
});

test('moves pending probes that are still visible to the front without duplicating queries', async () => {
  let releaseFirst: (() => void) | undefined;
  const calls: string[] = [];
  const visibleUpdates: Array<{ key: string; snapshot: LocalLatencySnapshot }> = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 1,
    isAvailable: () => true,
    query: async (ip) => {
      calls.push(ip);
      if (ip === '10.0.5.1') {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return { success: true, latency_ms: Number(ip.split('.').at(-1)) };
    },
  });

  const firstBatch = scheduler.measure([
    { key: 'old-one', ip: '10.0.5.1', port: '27015' },
    { key: 'old-two', ip: '10.0.5.2', port: '27015' },
    { key: 'old-three', ip: '10.0.5.3', port: '27015' },
  ], () => undefined);

  await delay(1);

  const secondBatch = scheduler.measure([
    { key: 'visible-three', ip: '10.0.5.3', port: '27015' },
    { key: 'visible-four', ip: '10.0.5.4', port: '27015' },
  ], (key, snapshot) => {
    visibleUpdates.push({ key, snapshot });
  });

  releaseFirst?.();
  await Promise.all([firstBatch, secondBatch]);

  assert.deepEqual(calls, ['10.0.5.1', '10.0.5.3', '10.0.5.4']);
  assert.equal(calls.filter(ip => ip === '10.0.5.3').length, 1);
  assert.equal(visibleUpdates.find(update => update.key === 'visible-three' && update.snapshot.status === 'success')?.snapshot.latencyMs, 3);
});

test('promotes an existing background queued probe when it becomes visible', async () => {
  let releaseFirst: (() => void) | undefined;
  const calls: string[] = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 1,
    isAvailable: () => true,
    query: async (ip) => {
      calls.push(ip);
      if (ip === '10.0.9.1') {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return { success: true, latency_ms: Number(ip.split('.').at(-1)) };
    },
  });

  const background = scheduler.measure([
    { key: 'active-one', ip: '10.0.9.1', port: '27015', priority: 0 },
    { key: 'background-two', ip: '10.0.9.2', port: '27015', priority: 1 },
    { key: 'background-three', ip: '10.0.9.3', port: '27015', priority: 1 },
  ], () => undefined, { mode: 'background' });

  await delay(1);

  const foreground = scheduler.measure([
    { key: 'visible-three', ip: '10.0.9.3', port: '27015', priority: 0 },
    { key: 'visible-four', ip: '10.0.9.4', port: '27015', priority: 0 },
  ], () => undefined);

  releaseFirst?.();
  await Promise.all([background, foreground]);

  assert.deepEqual(calls, ['10.0.9.1', '10.0.9.3', '10.0.9.4']);
});

test('clears pending probes when the next visible batch has no latency targets', async () => {
  let releaseFirst: (() => void) | undefined;
  const calls: string[] = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 1,
    isAvailable: () => true,
    query: async (ip) => {
      calls.push(ip);
      if (ip === '10.0.6.1') {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return { success: true, latency_ms: 10 };
    },
  });

  const firstBatch = scheduler.measure([
    { key: 'old-one', ip: '10.0.6.1', port: '27015' },
    { key: 'old-two', ip: '10.0.6.2', port: '27015' },
  ], () => undefined);

  await delay(1);
  await scheduler.measure([], () => undefined);
  releaseFirst?.();
  await firstBatch;

  assert.deepEqual(calls, ['10.0.6.1']);
});

test('background batches do not replace pending visible probes', async () => {
  let releaseFirst: (() => void) | undefined;
  const calls: string[] = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 1,
    isAvailable: () => true,
    query: async (ip) => {
      calls.push(ip);
      if (ip === '10.0.7.1') {
        await new Promise<void>(resolve => {
          releaseFirst = resolve;
        });
      }
      return { success: true, latency_ms: Number(ip.split('.').at(-1)) };
    },
  });

  const foreground = scheduler.measure([
    { key: 'visible-one', ip: '10.0.7.1', port: '27015' },
    { key: 'visible-two', ip: '10.0.7.2', port: '27015' },
  ], () => undefined);

  await delay(1);

  const background = scheduler.measure([
    { key: 'background-three', ip: '10.0.7.3', port: '27015' },
  ], () => undefined, { mode: 'background' });

  releaseFirst?.();
  await Promise.all([foreground, background]);

  assert.deepEqual(calls, ['10.0.7.1', '10.0.7.2', '10.0.7.3']);
});

test('marks targets unavailable without querying when the Tauri runtime is missing', async () => {
  let calls = 0;
  const updates: LocalLatencySnapshot[] = [];

  const scheduler = createLocalLatencyScheduler({
    isAvailable: () => false,
    query: async () => {
      calls += 1;
      return { success: true, latency_ms: 1 };
    },
  });

  await scheduler.measure([{ key: 'browser', ip: '10.0.0.5', port: '27015' }], (_key, snapshot) => {
    updates.push(snapshot);
  });

  assert.equal(calls, 0);
  assert.deepEqual(updates.map((snapshot) => snapshot.status), ['unavailable']);
});
