import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTemplate,
  median,
  percentile,
  verify,
} from './windows-acceptance.mjs';

test('median and p95 match a 30-sample scene', () => {
  const samples = Array.from({ length: 30 }, (_, index) => index + 1);
  assert.equal(median(samples), 15.5);
  assert.equal(percentile(samples, 95), 29);
});

test('verify rejects an empty template and accepts a complete Windows file', () => {
  const empty = buildTemplate('abc', { os: 'windows', webView2: '1', powerScheme: 'balanced' });
  assert.equal(verify(empty).length > 0, true);

  const samples = Array.from({ length: 30 }, (_, index) => 100 + index);
  const filled = buildTemplate('abc', { os: 'windows', webView2: '1.0', powerScheme: 'balanced' });
  filled.build = 'release';
  filled.traces = { webView2DevTools: true, wprWpa: true, includesCredentials: false };
  filled.stability8h = { completed: true, notes: 'rss stable' };
  for (const scene of Object.keys(filled.scenes)) {
    if (scene === 'background_30m') continue;
    filled.scenes[scene].samples = samples;
    filled.scenes[scene].median = median(samples);
    filled.scenes[scene].p95 = percentile(samples, 95);
  }
  assert.deepEqual(verify(filled), []);
});
