import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDuration } from './serverDetailFormat.ts';

test('formatDuration uses hours when present and minutes otherwise', () => {
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(59), '0m');
  assert.equal(formatDuration(60), '1m');
  assert.equal(formatDuration(3600), '1h 0m');
  assert.equal(formatDuration(3660), '1h 1m');
});
