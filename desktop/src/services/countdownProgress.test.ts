import assert from 'node:assert/strict';
import test from 'node:test';
import { countdownProgressLabel, countdownProgressPercent } from './countdownProgress.ts';

test('countdownProgressPercent keeps the existing empty and elapsed math', () => {
  assert.equal(countdownProgressPercent(60, 0), 0);
  assert.equal(countdownProgressPercent(60, 60), 0);
  assert.equal(countdownProgressPercent(30, 60), 50);
  assert.equal(countdownProgressPercent(0, 60), 100);
});

test('countdownProgressLabel keeps the loading ellipsis and second suffix', () => {
  assert.equal(countdownProgressLabel(12, true), '...');
  assert.equal(countdownProgressLabel(12, false), '12s');
  assert.equal(countdownProgressLabel(0), '0s');
});
