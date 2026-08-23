import assert from 'node:assert/strict';
import test from 'node:test';
import { queryLatencyWithRetry } from './a2sLatencyQuery.ts';

test('queryLatencyWithRetry retries then returns the first successful RTT', async () => {
  const attempts: number[] = [];
  const snapshot = await queryLatencyWithRetry({
    query: async () => {
      attempts.push(1);
      if (attempts.length < 2) {
        return { success: false, error: 'timeout', latency_ms: undefined };
      }
      return { success: true, latency_ms: 24.6 };
    },
    target: { key: 'a', ip: '10.0.0.1', port: '27015' },
    timeoutMs: 2000,
    retryCount: 1,
    retryDelayMs: 0,
    now: () => 1000,
    sleep: async () => undefined,
  });
  assert.equal(attempts.length, 2);
  assert.deepEqual(snapshot, { status: 'success', latencyMs: 25, updatedAt: 1000 });
});

test('queryLatencyWithRetry keeps the last error after exhausting retries', async () => {
  const snapshot = await queryLatencyWithRetry({
    query: async () => {
      throw new Error('offline');
    },
    target: { key: 'b', ip: '10.0.0.2', port: '27015' },
    timeoutMs: 1500,
    retryCount: 1,
    retryDelayMs: 0,
    now: () => 9,
    sleep: async () => undefined,
  });
  assert.deepEqual(snapshot, { status: 'failed', error: 'offline', updatedAt: 9 });
});
