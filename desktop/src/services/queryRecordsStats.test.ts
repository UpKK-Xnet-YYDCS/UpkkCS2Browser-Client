import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateStats,
  failureFlag,
  formatLatencyMs,
  formatQueryNodeLabel,
} from './queryRecordsStats.ts';

test('formatQueryNodeLabel treats missing and local nodes as local', () => {
  assert.equal(formatQueryNodeLabel(false, 'hk-1', 'Local', 'Remote'), 'Local');
  assert.equal(formatQueryNodeLabel(true, 'local', 'Local', 'Remote'), 'Local');
  assert.equal(formatQueryNodeLabel(true, ' LOCAL ', 'Local', 'Remote'), 'Local');
});

test('formatQueryNodeLabel prefixes remote nodes and falls back to a dash', () => {
  assert.equal(formatQueryNodeLabel(true, 'hk-1', 'Local', 'Remote'), 'Remote: hk-1');
  assert.equal(formatQueryNodeLabel(true, '   ', 'Local', 'Remote'), 'Remote: -');
});

test('formatLatencyMs clamps non-positive values', () => {
  assert.equal(formatLatencyMs(12.34), '12.3');
  assert.equal(formatLatencyMs(0), '0.0');
  assert.equal(formatLatencyMs(-8), '0.0');
  assert.equal(formatLatencyMs(Number.NaN), '0.0');
});

test('failureFlag is binary for a bucket', () => {
  assert.equal(failureFlag({ query_count: 0, success_count: 0 }), 0);
  assert.equal(failureFlag({ query_count: 4, success_count: 4 }), 0);
  assert.equal(failureFlag({ query_count: 4, success_count: 3 }), 100);
});

test('calculateStats weights average latency and ignores failed max samples', () => {
  assert.deepEqual(calculateStats([]), {
    totalQueries: 0,
    avgLatency: 0,
    maxLatency: 0,
    successRate: 0,
  });

  const summary = calculateStats([
    { query_count: 2, success_count: 2, avg_latency: 10, max_latency: 12 },
    { query_count: 2, success_count: 0, avg_latency: 0, max_latency: 999 },
    { query_count: 1, success_count: 1, avg_latency: 40, max_latency: 40 },
  ]);

  assert.equal(summary.totalQueries, 5);
  assert.equal(summary.maxLatency, 40);
  assert.equal(summary.successRate, 60);
  assert.equal(summary.avgLatency, 20);
});
