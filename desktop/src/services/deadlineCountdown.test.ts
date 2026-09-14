import assert from 'node:assert/strict';
import test from 'node:test';
import { isDocumentHidden, remainingCountdownSeconds } from './deadlineCountdown.ts';

test('remaining countdown is computed from the deadline rather than a tick counter', () => {
  assert.equal(remainingCountdownSeconds(10_000, 10_000), 0);
  assert.equal(remainingCountdownSeconds(10_400, 10_000), 1);
  assert.equal(remainingCountdownSeconds(11_000, 10_000), 1);
  assert.equal(remainingCountdownSeconds(9_000, 10_000), 0);
});

test('document hidden helper is false when the document is missing or visible', () => {
  assert.equal(isDocumentHidden(undefined), false);
  assert.equal(isDocumentHidden({ hidden: false }), false);
  assert.equal(isDocumentHidden({ hidden: true }), true);
});
