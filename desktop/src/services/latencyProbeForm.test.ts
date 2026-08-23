import assert from 'node:assert/strict';
import test from 'node:test';
import { applyNormalizedLatencyProbeForm, buildLatencyProbeStartPlan, latencyProbeFormToOptions } from './latencyProbeForm.ts';

test('latencyProbeFormToOptions converts seconds back to milliseconds', () => {
  assert.deepEqual(
    latencyProbeFormToOptions({
      intervalSeconds: 2,
      durationSeconds: 120,
      timeoutSeconds: 3,
      retryCount: 1,
      retryDelayMs: 300,
    }),
    {
      intervalMs: 2_000,
      durationMs: 120_000,
      timeoutMs: 3_000,
      retryCount: 1,
      retryDelayMs: 300,
    },
  );
});

test('applyNormalizedLatencyProbeForm writes milliseconds back as seconds', () => {
  assert.deepEqual(
    applyNormalizedLatencyProbeForm({
      intervalMs: 2_000,
      durationMs: 120_000,
      timeoutMs: 3_000,
      retryCount: 1,
      retryDelayMs: 300,
    }),
    {
      intervalSeconds: 2,
      durationSeconds: 120,
      timeoutSeconds: 3,
      retryCount: 1,
      retryDelayMs: 300,
    },
  );
});

test('buildLatencyProbeStartPlan normalizes then writes the clamped form back', () => {
  const plan = buildLatencyProbeStartPlan({
    intervalSeconds: 0.1,
    durationSeconds: 1,
    timeoutSeconds: 0.1,
    retryCount: 99,
    retryDelayMs: 9_999,
  });
  assert.deepEqual(plan.options, {
    intervalMs: 1_000,
    durationMs: 5_000,
    timeoutMs: 500,
    retryCount: 5,
    retryDelayMs: 3_000,
  });
  assert.deepEqual(plan.form, {
    intervalSeconds: 1,
    durationSeconds: 5,
    timeoutSeconds: 0.5,
    retryCount: 5,
    retryDelayMs: 3_000,
  });
});
