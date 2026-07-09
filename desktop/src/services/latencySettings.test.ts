import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LATENCY_DETECTION_SETTINGS,
  normalizeLatencyDetectionSettings,
} from './latencySettings.ts';

test('normalizes local latency detection settings with safe defaults', () => {
  assert.deepEqual(DEFAULT_LATENCY_DETECTION_SETTINGS, {
    deepScanEnabled: true,
    workerCount: 3,
    retryCount: 1,
    retryDelayMs: 300,
    a2sTimeoutMs: 2_000,
  });
  assert.deepEqual(normalizeLatencyDetectionSettings({}), DEFAULT_LATENCY_DETECTION_SETTINGS);

  assert.deepEqual(normalizeLatencyDetectionSettings({
    deepScanEnabled: true,
    workerCount: 99,
    retryCount: 99,
    retryDelayMs: 99_000,
    a2sTimeoutMs: 99_000,
  }), {
    deepScanEnabled: true,
    workerCount: 6,
    retryCount: 5,
    retryDelayMs: 3_000,
    a2sTimeoutMs: 5_000,
  });

  assert.deepEqual(normalizeLatencyDetectionSettings({
    workerCount: -1,
    retryCount: -1,
    retryDelayMs: -1,
    a2sTimeoutMs: -1,
  }), {
    ...DEFAULT_LATENCY_DETECTION_SETTINGS,
    workerCount: 1,
    retryCount: 0,
    retryDelayMs: 0,
    a2sTimeoutMs: 500,
  });
});
