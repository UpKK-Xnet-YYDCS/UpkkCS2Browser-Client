import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupLatencyTargets,
  latencyAddressKey,
  normalizeLatencyConcurrency,
  normalizeLatencyPriority,
  normalizeLatencyRetryCount,
  normalizeLatencyRetryDelayMs,
  normalizeLatencyTimeoutMs,
} from './a2sLatencyPolicy.ts';

test('latency normalizers clamp to the existing scheduler bounds', () => {
  assert.equal(normalizeLatencyConcurrency(undefined), 3);
  assert.equal(normalizeLatencyConcurrency(0), 1);
  assert.equal(normalizeLatencyConcurrency(9), 6);
  assert.equal(normalizeLatencyTimeoutMs(undefined), 2000);
  assert.equal(normalizeLatencyTimeoutMs(100), 500);
  assert.equal(normalizeLatencyTimeoutMs(9000), 5000);
  assert.equal(normalizeLatencyRetryCount(undefined), 1);
  assert.equal(normalizeLatencyRetryCount(-2), 0);
  assert.equal(normalizeLatencyRetryCount(8), 5);
  assert.equal(normalizeLatencyRetryDelayMs(undefined), 300);
  assert.equal(normalizeLatencyRetryDelayMs(-1), 0);
  assert.equal(normalizeLatencyRetryDelayMs(4000), 3000);
  assert.equal(normalizeLatencyPriority(undefined), 0);
  assert.equal(normalizeLatencyPriority(2.8), 2);
});

test('groupLatencyTargets de-duplicates addresses and keeps the lowest priority', () => {
  assert.equal(latencyAddressKey(' 10.0.0.1 ', ' 27015 '), '10.0.0.1:27015');
  const grouped = groupLatencyTargets([
    { key: 'one', ip: '10.0.0.1', port: '27015', priority: 2 },
    { key: 'dup', ip: '10.0.0.1', port: '27015', priority: 0 },
    { key: 'two', ip: '10.0.0.2', port: '27016' },
    { key: 'empty', ip: '  ', port: ' ' },
  ]);
  assert.equal(grouped.size, 2);
  assert.deepEqual(grouped.get('10.0.0.1:27015')?.keys, ['one', 'dup']);
  assert.equal(grouped.get('10.0.0.1:27015')?.priority, 0);
  assert.equal(grouped.get('10.0.0.2:27016')?.keys[0], 'two');
});

