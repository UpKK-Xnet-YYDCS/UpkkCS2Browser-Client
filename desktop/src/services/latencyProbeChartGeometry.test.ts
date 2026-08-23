import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LATENCY_PROBE_CHART_PADDING,
  buildLatencyProbePath,
  latencyProbeMaxMs,
  latencyProbeMaxSequence,
  latencyProbeX,
  latencyProbeYForMs,
  latencyProbeYForPercent,
  pickLatencyProbeHover,
} from './latencyProbeChartGeometry.ts';

test('latency probe scales keep the existing floors', () => {
  assert.equal(latencyProbeMaxSequence([]), 1);
  assert.equal(latencyProbeMaxSequence([1, 4, 2]), 4);
  assert.equal(latencyProbeMaxMs([]), 100);
  assert.equal(latencyProbeMaxMs([{ latencyMs: 40, rttStabilityMs: 12 }]), 100);
  assert.equal(latencyProbeMaxMs([{ latencyMs: 180, rttStabilityMs: 20 }]), 180);
  assert.equal(latencyProbeMaxMs([{ latencyMs: 20, rttStabilityMs: 150 }]), 150);
});

test('latency probe coordinates keep single-point and percent scales', () => {
  assert.equal(latencyProbeX(1, 1), LATENCY_PROBE_CHART_PADDING);
  assert.equal(latencyProbeX(1, 3), LATENCY_PROBE_CHART_PADDING);
  assert.equal(latencyProbeX(3, 3), 518);
  assert.equal(latencyProbeYForMs(0, 100), 178);
  assert.equal(latencyProbeYForMs(100, 100), LATENCY_PROBE_CHART_PADDING);
  assert.equal(latencyProbeYForPercent(0), 178);
  assert.equal(latencyProbeYForPercent(100), LATENCY_PROBE_CHART_PADDING);
});

test('buildLatencyProbePath breaks on missing values and starts a new segment', () => {
  const path = buildLatencyProbePath(
    [{ sequence: 1, value: 0 }, { sequence: 2 }, { sequence: 3, value: 100 }],
    3,
    (point) => point.value,
    (value) => latencyProbeYForMs(value, 100),
  );
  assert.equal(path, 'M 42.00 178.00 M 518.00 42.00');
});

test('pickLatencyProbeHover selects the nearest point and clamps tooltip percent', () => {
  assert.equal(pickLatencyProbeHover({ width: 560, left: 0 }, 100, []), null);

  const single = pickLatencyProbeHover({ width: 560, left: 10 }, 400, [{ sequence: 1 }]);
  assert.deepEqual(single, { point: { sequence: 1 }, x: 42, left: 18 });

  const points = [{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }];
  const left = pickLatencyProbeHover({ width: 560, left: 0 }, 50, points);
  const mid = pickLatencyProbeHover({ width: 560, left: 0 }, 280, points);
  const right = pickLatencyProbeHover({ width: 560, left: 0 }, 540, points);
  assert.deepEqual(left, { point: { sequence: 1 }, x: 42, left: 18 });
  assert.deepEqual(mid, { point: { sequence: 2 }, x: 280, left: 50 });
  assert.deepEqual(right, { point: { sequence: 3 }, x: 518, left: 82 });
});
