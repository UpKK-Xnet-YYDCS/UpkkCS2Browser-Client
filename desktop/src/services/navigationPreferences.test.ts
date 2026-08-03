import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_NAVIGATION_LABEL_MODE,
  normalizeNavigationLabelMode,
} from './navigationPreferences.ts';

test('defaults top navigation to icons only', () => {
  assert.equal(normalizeNavigationLabelMode(null), DEFAULT_NAVIGATION_LABEL_MODE);
  assert.equal(normalizeNavigationLabelMode('unexpected'), 'icons');
});

test('restores the explicit navigation labels preference', () => {
  assert.equal(normalizeNavigationLabelMode('labels'), 'labels');
});
