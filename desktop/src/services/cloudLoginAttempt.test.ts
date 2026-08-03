import assert from 'node:assert/strict';
import test from 'node:test';
import { reduceCloudLoginAttempt } from './cloudLoginAttempt.ts';

test('tracks the provider for an active cloud login attempt', () => {
  assert.equal(reduceCloudLoginAttempt(null, { type: 'started', provider: 'steam' }), 'steam');
});

test('restores login controls when a cloud login attempt finishes', () => {
  assert.equal(reduceCloudLoginAttempt('google', { type: 'finished' }), null);
});
