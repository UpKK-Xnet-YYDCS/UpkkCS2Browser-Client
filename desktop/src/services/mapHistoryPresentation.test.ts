import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCurrentMapSession,
  mapHistoryLoadError,
  mapSessionChartSeries,
  mapSessionDurationClass,
  mapSessionIconClass,
  mapSessionRowClass,
  mapSessionSampleInterval,
} from './mapHistoryPresentation.ts';

test('isCurrentMapSession only marks the first item on page one', () => {
  assert.equal(isCurrentMapSession(1, 0), true);
  assert.equal(isCurrentMapSession(1, 1), false);
  assert.equal(isCurrentMapSession(2, 0), false);
});

test('mapSessionChartSeries floors empty series at 1 and treats missing bots as empty', () => {
  assert.deepEqual(mapSessionChartSeries([]), {
    realPlayers: [],
    bots: [],
    maxValue: 1,
  });
  assert.deepEqual(mapSessionChartSeries([3, 8], [1]), {
    realPlayers: [3, 8],
    bots: [1],
    maxValue: 8,
  });
});

test('mapSessionSampleInterval uses duration for a single sample', () => {
  assert.equal(mapSessionSampleInterval(120, 1), 120);
  assert.equal(mapSessionSampleInterval(120, 5), 30);
});

test('map session classes keep current vs historical treatments', () => {
  assert.match(mapSessionRowClass(true), /bg-green-50/);
  assert.match(mapSessionRowClass(false), /bg-gray-50/);
  assert.match(mapSessionIconClass(true), /from-green-400/);
  assert.match(mapSessionIconClass(false), /from-green-500/);
  assert.match(mapSessionDurationClass(true), /bg-green-100/);
  assert.match(mapSessionDurationClass(false), /bg-blue-100/);
});

test('mapHistoryLoadError keeps the existing fallback', () => {
  assert.equal(mapHistoryLoadError(new Error('boom'), 'failed'), 'boom');
  assert.equal(mapHistoryLoadError('nope', 'failed'), 'failed');
});
