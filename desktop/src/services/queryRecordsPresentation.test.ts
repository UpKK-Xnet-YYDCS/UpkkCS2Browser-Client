import assert from 'node:assert/strict';
import test from 'node:test';
import {
  paginateRecentRecords,
  queryRecordDurationClass,
  queryRecordGlobalIndex,
  queryRecordNodeClass,
  queryRecordRowClass,
  queryRecordStatusClass,
  queryRecordsHoverView,
  queryRecordsLoadError,
  queryRecordsResponseError,
  querySummaryMaxLatencyClass,
  querySummarySuccessRateClass,
} from './queryRecordsPresentation.ts';

test('paginateRecentRecords uses 3-item pages and clamps past the last page', () => {
  assert.deepEqual(paginateRecentRecords([], 1), {
    totalPages: 1,
    safePage: 1,
    startIndex: 0,
    items: [],
  });

  const first = paginateRecentRecords(['a', 'b', 'c', 'd'], 1);
  assert.deepEqual(first, {
    totalPages: 2,
    safePage: 1,
    startIndex: 0,
    items: ['a', 'b', 'c'],
  });

  const overflow = paginateRecentRecords(['a', 'b', 'c', 'd'], 9);
  assert.deepEqual(overflow, {
    totalPages: 2,
    safePage: 2,
    startIndex: 3,
    items: ['d'],
  });
});

test('query record classes keep success/fail and 500ms warning thresholds', () => {
  assert.match(queryRecordRowClass(true), /border-gray-200/);
  assert.match(queryRecordRowClass(false), /border-red-300/);
  assert.match(queryRecordStatusClass(true), /bg-green-100/);
  assert.match(queryRecordStatusClass(false), /bg-red-200/);
  assert.match(queryRecordDurationClass(true, 500), /bg-blue-100/);
  assert.match(queryRecordDurationClass(true, 501), /bg-red-200/);
  assert.match(queryRecordDurationClass(false, 10), /bg-red-200/);
  assert.match(queryRecordNodeClass(true), /bg-purple-100/);
  assert.match(queryRecordNodeClass(false), /bg-gray-200/);
  assert.equal(querySummaryMaxLatencyClass(500), 'text-lg font-bold text-gray-900 dark:text-white');
  assert.equal(querySummaryMaxLatencyClass(501), 'text-lg font-bold text-red-500');
  assert.equal(querySummarySuccessRateClass(90), 'text-lg font-bold text-green-600 dark:text-green-400');
  assert.equal(querySummarySuccessRateClass(89.9), 'text-lg font-bold text-red-500');
  assert.equal(queryRecordGlobalIndex(2, 1), 4);
});

test('query record fetch errors keep the original fallback copy', () => {
  assert.equal(queryRecordsResponseError(undefined), 'Unknown error');
  assert.equal(queryRecordsResponseError(''), 'Unknown error');
  assert.equal(queryRecordsResponseError('boom'), 'boom');
  assert.equal(queryRecordsLoadError(new Error('timeout')), 'timeout');
  assert.equal(queryRecordsLoadError('nope'), 'Failed to load');
});

test('queryRecordsHoverView derives rate, failure flag, and successful max latency', () => {
  assert.deepEqual(queryRecordsHoverView({ query_count: 0, success_count: 0, max_latency: 12 }), {
    successRate: 0,
    failed: false,
    maxLatency: 0,
  });
  assert.deepEqual(queryRecordsHoverView({ query_count: 4, success_count: 3, max_latency: 40 }), {
    successRate: 75,
    failed: true,
    maxLatency: 40,
  });
  assert.deepEqual(queryRecordsHoverView({ query_count: 2, success_count: 0, max_latency: 999 }), {
    successRate: 0,
    failed: true,
    maxLatency: 0,
  });
});
