import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDuration,
  formatTime,
  getTimestamp,
  parseMapHistoryDate,
  resolveMapHistoryLocale,
} from './mapHistoryFormat.ts';

const units = { minutesUnit: 'min', hoursUnit: 'hr' };

test('formatDuration uses seconds, minutes, and hours thresholds', () => {
  assert.equal(formatDuration(45, units), '45s');
  assert.equal(formatDuration(120, units), '2 min');
  assert.equal(formatDuration(3600, units), '1 hr');
  assert.equal(formatDuration(3660, units), '1 hr 1 min');
});

test('resolveMapHistoryLocale maps supported languages and falls back to en-US', () => {
  assert.equal(resolveMapHistoryLocale('zh-CN'), 'zh-CN');
  assert.equal(resolveMapHistoryLocale('ja'), 'ja-JP');
  assert.equal(resolveMapHistoryLocale('ko'), 'ko-KR');
  assert.equal(resolveMapHistoryLocale('unknown'), 'en-US');
});

test('parseMapHistoryDate accepts ISO strings and unix seconds', () => {
  assert.equal(parseMapHistoryDate(''), null);
  assert.equal(parseMapHistoryDate('not-a-date'), null);

  const iso = parseMapHistoryDate('2026-01-31T12:51:56.231+08:00');
  assert.ok(iso);
  assert.equal(iso.getUTCFullYear(), 2026);

  const unix = parseMapHistoryDate('1738303916');
  assert.ok(unix);
  assert.equal(unix.getTime(), 1738303916 * 1000);
});

test('formatTime returns empty for invalid input and formats valid timestamps', () => {
  assert.equal(formatTime('', 'en'), '');
  assert.equal(formatTime('not-a-date', 'en'), '');
  assert.match(formatTime('2026-01-31T12:51:56.231+08:00', 'en'), /31/);
  assert.notEqual(formatTime('1738303916', 'en'), '');
});

test('getTimestamp prefers timestamp then started_at', () => {
  assert.equal(getTimestamp({ timestamp: 'a', started_at: 'b' }), 'a');
  assert.equal(getTimestamp({ timestamp: '', started_at: 'b' }), 'b');
  assert.equal(getTimestamp({ timestamp: '' }), '');
});
