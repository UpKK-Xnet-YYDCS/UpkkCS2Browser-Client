import assert from 'node:assert/strict';
import test from 'node:test';

import { createLocalLatencyScheduler } from './a2sLatency.ts';
import type { LocalLatencyQueryResult, LocalLatencyTarget } from './a2sLatencyTypes.ts';

const targets: LocalLatencyTarget[] = [
  { key: 'one', ip: '10.1.0.1', port: '27015' },
  { key: 'two', ip: '10.1.0.2', port: '27015' },
  { key: 'three', ip: '10.1.0.3', port: '27015' },
  { key: 'four', ip: '10.1.0.4', port: '27015' },
];

test('batches latency probes inside the concurrency window and keeps single probes on the single command', async () => {
  const single: string[] = [];
  const batches: string[][] = [];

  const scheduler = createLocalLatencyScheduler({
    concurrency: 2,
    retryCount: 0,
    isAvailable: () => true,
    query: async (ip) => {
      single.push(ip);
      return { success: true, latency_ms: 10 };
    },
    queryBatch: async (batchTargets) => {
      batches.push(batchTargets.map(target => target.ip));
      return batchTargets.map(target => ({
        success: true,
        latency_ms: Number(target.ip.split('.').at(-1)),
      }));
    },
  });

  await scheduler.measure(targets, () => undefined);
  await scheduler.measure([{ key: 'solo', ip: '10.1.0.9', port: '27015' }], () => undefined);

  assert.deepEqual(batches, [
    ['10.1.0.1', '10.1.0.2'],
    ['10.1.0.3', '10.1.0.4'],
  ]);
  assert.deepEqual(single, ['10.1.0.9']);
});

test('batch latency retries only the failed targets and preserves result mapping', async () => {
  const batches: string[][] = [];
  const sleeps: number[] = [];
  const updates = new Map<string, number | undefined>();

  const scheduler = createLocalLatencyScheduler({
    concurrency: 3,
    retryCount: 1,
    retryDelayMs: 40,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    isAvailable: () => true,
    query: async () => ({ success: true, latency_ms: 7 }),
    queryBatch: async (batchTargets) => {
      batches.push(batchTargets.map(target => `${target.ip}:${target.port}`));
      return batchTargets.map((target): LocalLatencyQueryResult => {
        if (target.ip === '10.2.0.2' && batches.length === 1) {
          return { success: false, error: 'timeout' };
        }
        return { success: true, latency_ms: Number(target.port) };
      });
    },
  });

  await scheduler.measure([
    { key: 'a', ip: '10.2.0.1', port: '11' },
    { key: 'b', ip: '10.2.0.2', port: '22' },
    { key: 'c', ip: '10.2.0.3', port: '33' },
  ], (key, snapshot) => {
    if (snapshot.status === 'success') updates.set(key, snapshot.latencyMs);
  });

  assert.deepEqual(batches, [
    ['10.2.0.1:11', '10.2.0.2:22', '10.2.0.3:33'],
  ]);
  assert.deepEqual(sleeps, [40]);
  assert.equal(updates.get('a'), 11);
  assert.equal(updates.get('b'), 7);
  assert.equal(updates.get('c'), 33);
});

test('remembered fresh latency is reused without another query', async () => {
  let calls = 0;
  const scheduler = createLocalLatencyScheduler({
    ttlMs: 60_000,
    now: () => 10_000,
    isAvailable: () => true,
    query: async () => {
      calls += 1;
      return { success: true, latency_ms: 99 };
    },
    queryBatch: async () => {
      calls += 1;
      return [];
    },
  });

  scheduler.remember('10.3.0.1:27015', {
    status: 'success',
    latencyMs: 15,
    updatedAt: 9_000,
  });
  const seen: number[] = [];
  await scheduler.measure([
    { key: 'cached', ip: '10.3.0.1', port: '27015' },
  ], (_key, snapshot) => {
    if (snapshot.status === 'success' && snapshot.latencyMs !== undefined) seen.push(snapshot.latencyMs);
  });

  assert.equal(calls, 0);
  assert.deepEqual(seen, [15]);
});
