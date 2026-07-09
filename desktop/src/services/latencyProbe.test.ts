import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLatencyProbeSession,
  getLatencyProbeSeries,
  getLatencyProbeMetrics,
  normalizeLatencyProbeOptions,
  type LatencyProbeSample,
} from './latencyProbe.ts';

test('normalizes latency probe options with safe defaults', () => {
  assert.deepEqual(normalizeLatencyProbeOptions({}), {
    intervalMs: 1_000,
    durationMs: 120_000,
    timeoutMs: 3_000,
    retryCount: 1,
    retryDelayMs: 300,
  });

  assert.deepEqual(normalizeLatencyProbeOptions({
    intervalMs: 100,
    durationMs: 1_000,
    timeoutMs: 25_000,
    retryCount: 99,
    retryDelayMs: 99_000,
  }), {
    intervalMs: 1_000,
    durationMs: 5_000,
    timeoutMs: 5_000,
    retryCount: 5,
    retryDelayMs: 3_000,
  });
});

test('calculates packet loss and RTT stability metrics from samples', () => {
  const samples: LatencyProbeSample[] = [
    { sequence: 1, startedAt: 1_000, completedAt: 1_040, status: 'success', latencyMs: 40 },
    { sequence: 2, startedAt: 6_000, completedAt: 6_000, status: 'failed', error: 'timeout' },
    { sequence: 3, startedAt: 11_000, completedAt: 11_070, status: 'success', latencyMs: 70 },
  ];

  const metrics = getLatencyProbeMetrics(samples);

  assert.equal(metrics.sent, 3);
  assert.equal(metrics.received, 2);
  assert.equal(metrics.lost, 1);
  assert.equal(metrics.packetLossPercent, 33.33);
  assert.equal(metrics.minLatencyMs, 40);
  assert.equal(metrics.avgLatencyMs, 55);
  assert.equal(metrics.maxLatencyMs, 70);
  assert.equal(metrics.rttStabilityMs, 15);
});

test('builds cumulative probe series for RTT, packet loss, and stability charts', () => {
  const samples: LatencyProbeSample[] = [
    { sequence: 1, startedAt: 1_000, completedAt: 1_040, status: 'success', latencyMs: 40 },
    { sequence: 2, startedAt: 2_000, completedAt: 2_000, status: 'failed', error: 'timeout' },
    { sequence: 3, startedAt: 3_000, completedAt: 3_090, status: 'success', latencyMs: 90 },
  ];

  assert.deepEqual(getLatencyProbeSeries(samples), [
    {
      sequence: 1,
      startedAt: 1_000,
      status: 'success',
      latencyMs: 40,
      packetLossPercent: 0,
      rttStabilityMs: 0,
      error: undefined,
    },
    {
      sequence: 2,
      startedAt: 2_000,
      status: 'failed',
      latencyMs: undefined,
      packetLossPercent: 50,
      rttStabilityMs: 0,
      error: 'timeout',
    },
    {
      sequence: 3,
      startedAt: 3_000,
      status: 'success',
      latencyMs: 90,
      packetLossPercent: 33.33,
      rttStabilityMs: 25,
      error: undefined,
    },
  ]);
});

test('runs realtime samples on the configured interval, retries failures, and stops at duration', async () => {
  let calls = 0;
  const samples: LatencyProbeSample[] = [];
  const session = createLatencyProbeSession({
    target: { ip: '10.0.3.1', port: '27015' },
    options: { intervalMs: 2_000, durationMs: 5_000, timeoutMs: 3_000, retryCount: 2 },
    now: () => calls * 1_000,
    sleep: async () => undefined,
    query: async () => {
      calls += 1;
      if (calls === 2) {
        return { success: false, error: 'timeout' };
      }
      return { success: true, latency_ms: 30 + calls };
    },
    onSample: sample => {
      samples.push(sample);
    },
  });

  const summary = await session.start();

  assert.equal(calls, 4);
  assert.deepEqual(samples.map(sample => sample.status), ['success', 'success', 'success']);
  assert.deepEqual(samples.map(sample => sample.sequence), [1, 2, 3]);
  assert.equal(samples[1].latencyMs, 33);
  assert.equal(summary.metrics.sent, 3);
  assert.equal(summary.metrics.received, 3);
  assert.equal(summary.metrics.packetLossPercent, 0);
});
