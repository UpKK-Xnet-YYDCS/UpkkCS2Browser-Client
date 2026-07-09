import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LATENCY_DETECTION_SETTINGS,
  normalizeLatencyDetectionSettings,
} from './latencySettings.ts';

test('normalizes local latency detection settings with safe defaults', () => {
  assert.deepEqual(normalizeLatencyDetectionSettings({}), DEFAULT_LATENCY_DETECTION_SETTINGS);

  assert.deepEqual(normalizeLatencyDetectionSettings({
    deepScanEnabled: true,
    workerCount: 99,
    retryCount: 99,
    retryDelayMs: 99_000,
  }), {
    deepScanEnabled: true,
    workerCount: 6,
    retryCount: 5,
    retryDelayMs: 3_000,
  });

  assert.deepEqual(normalizeLatencyDetectionSettings({
    workerCount: -1,
    retryCount: -1,
    retryDelayMs: -1,
  }), {
    ...DEFAULT_LATENCY_DETECTION_SETTINGS,
    workerCount: 1,
    retryCount: 0,
    retryDelayMs: 0,
  });
});
