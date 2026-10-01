import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_MEMOIZED_SERIES_POINTS,
  getLatencyProbeMetrics,
  getLatencyProbeSeries,
  resetLatencyProbeSeriesMemo,
} from './latencyProbeMetrics.ts';
import type {
  LatencyProbeAttempt,
  LatencyProbeMetrics,
  LatencyProbeSample,
  LatencyProbeSeriesPoint,
} from './latencyProbeTypes.ts';

// Verbatim copy of the previous (quadratic) implementation, used as the oracle.
function legacyRoundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function legacyMetrics(samples: LatencyProbeSample[]): LatencyProbeMetrics {
  const sent = samples.length;
  const successSamples = samples.filter(sample => sample.status === 'success' && Number.isFinite(sample.latencyMs));
  const received = successSamples.length;
  const lost = sent - received;
  const latencies = successSamples.map(sample => Math.max(0, sample.latencyMs ?? 0));
  const attempts = samples.flatMap(sample => sample.attempts ?? []);
  const failedAttempts = attempts.filter(attempt => attempt.status === 'failed').length;
  const observedLatencies = samples
    .map(sample => {
      if (Number.isFinite(sample.observedLatencyMs)) {
        return Math.max(0, sample.observedLatencyMs);
      }
      if (sample.status === 'success' && Number.isFinite(sample.latencyMs)) {
        return Math.max(0, sample.latencyMs ?? 0);
      }
      return Math.max(0, sample.completedAt - sample.startedAt);
    })
    .filter(value => Number.isFinite(value));
  const avg = latencies.length > 0 ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : undefined;
  const observedAvg = observedLatencies.length > 0
    ? observedLatencies.reduce((sum, value) => sum + value, 0) / observedLatencies.length
    : undefined;
  const variance = observedAvg === undefined
    ? undefined
    : observedLatencies.reduce((sum, value) => sum + (value - observedAvg) ** 2, 0) / observedLatencies.length;

  return {
    sent,
    received,
    lost,
    packetLossPercent: sent > 0 ? legacyRoundMetric((lost / sent) * 100) : 0,
    attempts: attempts.length,
    failedAttempts,
    attemptLossPercent: attempts.length > 0 ? legacyRoundMetric((failedAttempts / attempts.length) * 100) : 0,
    minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : undefined,
    avgLatencyMs: avg === undefined ? undefined : legacyRoundMetric(avg),
    maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : undefined,
    rttStabilityMs: variance === undefined ? undefined : legacyRoundMetric(Math.sqrt(variance)),
  };
}

function legacySeries(samples: LatencyProbeSample[]): LatencyProbeSeriesPoint[] {
  return samples.map((sample, index) => {
    const metrics = legacyMetrics(samples.slice(0, index + 1));
    const latencyMs = sample.status === 'success' && Number.isFinite(sample.latencyMs)
      ? Math.max(0, Math.round(sample.latencyMs ?? 0))
      : undefined;

    return {
      sequence: sample.sequence,
      startedAt: sample.startedAt,
      status: sample.status,
      latencyMs,
      packetLossPercent: metrics.packetLossPercent,
      rttStabilityMs: metrics.rttStabilityMs,
      error: sample.error,
    };
  });
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, weighted: Array<[number, () => T]>): T {
  let roll = random();
  for (const [weight, make] of weighted) {
    if (roll < weight) return make();
    roll -= weight;
  }
  return weighted[weighted.length - 1][1]();
}

function randomSample(random: () => number, sequence: number): LatencyProbeSample {
  const startedAt = 1_700_000_000_000 + sequence * 1_000 + Math.floor(random() * 40);
  const completedAt = startedAt + pick(random, [
    [0.8, () => Math.floor(random() * 3_000)],
    [0.1, () => random() * 3_000],
    [0.1, () => -Math.floor(random() * 5)],
  ]);
  const success = random() < 0.7;
  const observedLatencyMs = pick(random, [
    [0.6, () => Math.floor(random() * 2_500)],
    [0.2, () => random() * 2_500],
    [0.08, () => Number.NaN],
    [0.04, () => Number.POSITIVE_INFINITY],
    [0.04, () => -random() * 10],
    [0.04, () => undefined as unknown as number],
  ]);
  const latencyMs = success
    ? pick(random, [
      [0.8, () => Math.floor(random() * 400)],
      [0.1, () => random() * 400],
      [0.05, () => Number.NaN],
      [0.05, () => undefined],
    ])
    : pick(random, [[0.9, () => undefined], [0.1, () => Math.floor(random() * 400)]]);
  const attempts: LatencyProbeAttempt[] = Array.from({ length: Math.floor(random() * 3) }, (_, index) => ({
    sequence,
    attempt: index + 1,
    startedAt,
    completedAt,
    status: random() < 0.5 ? 'success' : 'failed',
    elapsedMs: Math.max(0, completedAt - startedAt),
  }));
  return {
    sequence,
    startedAt,
    completedAt,
    status: success ? 'success' : 'failed',
    observedLatencyMs,
    attempts,
    latencyMs,
    error: success ? undefined : 'A2S latency unavailable',
  };
}

function randomSamples(seed: number, count: number): LatencyProbeSample[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => randomSample(random, index + 1));
}

test('getLatencyProbeMetrics matches the previous implementation on random data', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const samples = randomSamples(seed, 1 + (seed * 7) % 90);
    assert.deepStrictEqual(getLatencyProbeMetrics(samples), legacyMetrics(samples), `seed ${seed}`);
  }
  assert.deepStrictEqual(getLatencyProbeMetrics([]), legacyMetrics([]));
});

test('getLatencyProbeSeries matches the previous implementation on random data', () => {
  resetLatencyProbeSeriesMemo();
  assert.deepStrictEqual(getLatencyProbeSeries([]), []);
  for (let seed = 1; seed <= 60; seed += 1) {
    const samples = randomSamples(seed, 1 + (seed * 13) % 160);
    assert.deepStrictEqual(getLatencyProbeSeries(samples), legacySeries(samples), `seed ${seed}`);
  }
});

test('incremental series updates match a full recomputation at every step', () => {
  resetLatencyProbeSeriesMemo();
  const all = randomSamples(99, 240);
  for (let count = 0; count <= all.length; count += 1) {
    const prefix = all.slice(0, count);
    assert.deepStrictEqual(getLatencyProbeSeries(prefix), legacySeries(prefix), `count ${count}`);
  }
});

test('the series memo never serves points for a different or edited input', () => {
  resetLatencyProbeSeriesMemo();
  const samples = randomSamples(7, 120);
  const first = getLatencyProbeSeries(samples);
  assert.deepStrictEqual(first, legacySeries(samples));

  // A different run that shares nothing, then the original again.
  const other = randomSamples(8, 60);
  assert.deepStrictEqual(getLatencyProbeSeries(other), legacySeries(other));
  assert.deepStrictEqual(getLatencyProbeSeries(samples), first);

  // Same objects, one edited in place in the middle; the prefix before it may be reused.
  const edited = samples.map(sample => ({ ...sample }));
  edited[50] = { ...edited[50], observedLatencyMs: edited[50].observedLatencyMs + 1_234.5 };
  assert.deepStrictEqual(getLatencyProbeSeries(edited), legacySeries(edited));
  edited[10].observedLatencyMs = Number.NaN;
  edited[10].status = edited[10].status === 'success' ? 'failed' : 'success';
  assert.deepStrictEqual(getLatencyProbeSeries(edited), legacySeries(edited));

  // Shrinking the input truncates the memo instead of reusing stale tail points.
  const shorter = samples.slice(0, 30);
  assert.deepStrictEqual(getLatencyProbeSeries(shorter), legacySeries(shorter));
  assert.deepStrictEqual(getLatencyProbeSeries(samples), legacySeries(samples));
});

test('each call returns fresh point objects', () => {
  resetLatencyProbeSeriesMemo();
  const samples = randomSamples(3, 20);
  const first = getLatencyProbeSeries(samples);
  const second = getLatencyProbeSeries(samples);
  assert.notEqual(first, second);
  assert.equal(first.every((point, index) => point !== second[index]), true);
  assert.deepStrictEqual(first, second);
});

test('inputs longer than the memo cap stay correct', () => {
  resetLatencyProbeSeriesMemo();
  const samples = randomSamples(5, MAX_MEMOIZED_SERIES_POINTS + 25);
  const expected = legacySeries(samples);
  assert.deepStrictEqual(getLatencyProbeSeries(samples), expected);
  assert.deepStrictEqual(getLatencyProbeSeries([...samples]), expected);
  const grown = [...samples, ...randomSamples(6, 3).map((sample, index) => ({
    ...sample,
    sequence: samples.length + index + 1,
  }))];
  assert.deepStrictEqual(getLatencyProbeSeries(grown), legacySeries(grown));
});
