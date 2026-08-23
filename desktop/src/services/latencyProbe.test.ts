import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLatencyProbeSession,
  getLatencyProbeSeries,
  getLatencyProbeMetrics,
  normalizeLatencyProbeOptions,
  type LatencyProbeSample,
} from './latencyProbe.ts';

import { buildLatencyProbeAttempt, buildLatencyProbeSample } from './latencyProbeSample.ts';

function successSample(sequence: number, startedAt: number, completedAt: number, latencyMs: number): LatencyProbeSample {
  return {
    sequence,
    startedAt,
    completedAt,
    status: 'success',
    observedLatencyMs: completedAt - startedAt,
    attempts: [{
      sequence,
      attempt: 1,
      startedAt,
      completedAt,
      status: 'success',
      elapsedMs: completedAt - startedAt,
      latencyMs,
    }],
    latencyMs,
  };
}

function failedSample(sequence: number, startedAt: number, completedAt: number, error: string): LatencyProbeSample {
  return {
    sequence,
    startedAt,
    completedAt,
    status: 'failed',
    observedLatencyMs: completedAt - startedAt,
    attempts: [{
      sequence,
      attempt: 1,
      startedAt,
      completedAt,
      status: 'failed',
      elapsedMs: completedAt - startedAt,
      error,
    }],
    error,
  };
}

test('normalizes latency probe options with safe defaults', () => {
  assert.deepEqual(normalizeLatencyProbeOptions({}), {
    intervalMs: 1_000,
    durationMs: 120_000,
    timeoutMs: 2_000,
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
    successSample(1, 1_000, 1_040, 40),
    failedSample(2, 6_000, 6_080, 'timeout'),
    successSample(3, 11_000, 11_070, 70),
  ];

  const metrics = getLatencyProbeMetrics(samples);

  assert.equal(metrics.sent, 3);
  assert.equal(metrics.received, 2);
  assert.equal(metrics.lost, 1);
  assert.equal(metrics.packetLossPercent, 33.33);
  assert.equal(metrics.attempts, 3);
  assert.equal(metrics.failedAttempts, 1);
  assert.equal(metrics.attemptLossPercent, 33.33);
  assert.equal(metrics.minLatencyMs, 40);
  assert.equal(metrics.avgLatencyMs, 55);
  assert.equal(metrics.maxLatencyMs, 70);
  assert.equal(metrics.rttStabilityMs, 17);
});

test('builds cumulative probe series for RTT, packet loss, and stability charts', () => {
  const samples: LatencyProbeSample[] = [
    successSample(1, 1_000, 1_040, 40),
    failedSample(2, 2_000, 2_080, 'timeout'),
    successSample(3, 3_000, 3_090, 90),
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
      rttStabilityMs: 20,
      error: 'timeout',
    },
    {
      sequence: 3,
      startedAt: 3_000,
      status: 'success',
      latencyMs: 90,
      packetLossPercent: 33.33,
      rttStabilityMs: 21.6,
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
  assert.equal(summary.metrics.attempts, 4);
  assert.equal(summary.metrics.failedAttempts, 1);
  assert.equal(summary.metrics.attemptLossPercent, 25);
});

test('counts only final failed samples as packet loss while attempt loss tracks retries', async () => {
  let calls = 0;
  const session = createLatencyProbeSession({
    target: { ip: '10.0.3.2', port: '27015' },
    options: { intervalMs: 3_000, durationMs: 5_000, retryCount: 2 },
    now: () => calls * 100,
    sleep: async () => undefined,
    query: async () => {
      calls += 1;
      if (calls < 3) {
        return { success: false, error: `timeout ${calls}` };
      }
      return { success: true, latency_ms: 45 };
    },
  });

  const summary = await session.start();

  assert.equal(summary.metrics.sent, 2);
  assert.equal(summary.metrics.received, 2);
  assert.equal(summary.metrics.packetLossPercent, 0);
  assert.equal(summary.metrics.attempts, 4);
  assert.equal(summary.metrics.failedAttempts, 2);
  assert.equal(summary.metrics.attemptLossPercent, 50);
});

test('counts final failed probe samples as packet loss', async () => {
  let calls = 0;
  const session = createLatencyProbeSession({
    target: { ip: '10.0.3.3', port: '27015' },
    options: { intervalMs: 60_000, durationMs: 5_000, retryCount: 1 },
    now: () => calls * 100,
    sleep: async () => undefined,
    query: async () => {
      calls += 1;
      return { success: false, error: 'timeout' };
    },
  });

  const summary = await session.start();

  assert.equal(summary.metrics.sent, 1);
  assert.equal(summary.metrics.received, 0);
  assert.equal(summary.metrics.lost, 1);
  assert.equal(summary.metrics.packetLossPercent, 100);
  assert.equal(summary.metrics.attempts, 2);
  assert.equal(summary.metrics.failedAttempts, 2);
  assert.equal(summary.metrics.attemptLossPercent, 100);
});

test('uses observed slow response time for jitter even when A2S RTT succeeds', () => {
  const samples: LatencyProbeSample[] = [
    successSample(1, 1_000, 1_040, 40),
    {
      ...successSample(2, 2_000, 2_500, 45),
      attempts: [{
        sequence: 2,
        attempt: 1,
        startedAt: 2_000,
        completedAt: 2_500,
        status: 'success',
        elapsedMs: 500,
        latencyMs: 45,
      }],
    },
  ];

  const metrics = getLatencyProbeMetrics(samples);

  assert.equal(metrics.packetLossPercent, 0);
  assert.equal(metrics.avgLatencyMs, 42.5);
  assert.equal(metrics.rttStabilityMs, 230);
});

test('buildLatencyProbeAttempt clamps elapsed time and only keeps success latency', () => {
  assert.deepEqual(buildLatencyProbeAttempt({
    sequence: 2,
    attempt: 1,
    startedAt: 50,
    completedAt: 10,
    status: 'success',
    latencyMs: 12.6,
  }), {
    sequence: 2,
    attempt: 1,
    startedAt: 50,
    completedAt: 10,
    status: 'success',
    elapsedMs: 0,
    latencyMs: 13,
  });
  assert.deepEqual(buildLatencyProbeAttempt({
    sequence: 2,
    attempt: 2,
    startedAt: 10,
    completedAt: 40,
    status: 'failed',
    error: 'timeout',
  }), {
    sequence: 2,
    attempt: 2,
    startedAt: 10,
    completedAt: 40,
    status: 'failed',
    elapsedMs: 30,
    error: 'timeout',
  });
});

test('buildLatencyProbeSample keeps the existing success and unavailable fallbacks', () => {
  assert.deepEqual(
    buildLatencyProbeSample(1, 100, 140, { success: true, latency_ms: 18.4 }, []),
    {
      sequence: 1,
      startedAt: 100,
      completedAt: 140,
      status: 'success',
      observedLatencyMs: 40,
      attempts: [],
      latencyMs: 18,
    },
  );
  assert.deepEqual(
    buildLatencyProbeSample(3, 200, 260, { success: false }, []),
    {
      sequence: 3,
      startedAt: 200,
      completedAt: 260,
      status: 'failed',
      observedLatencyMs: 60,
      attempts: [],
      error: 'A2S latency unavailable',
    },
  );
});
