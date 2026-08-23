import assert from 'node:assert/strict';
import test from 'node:test';
import { UPDATE_DOWNLOAD_FEEDBACK_MS, canDismissUpdate } from './updateModalPolicy.ts';

test('mandatory updates cannot be dismissed', () => {
  assert.equal(canDismissUpdate(true), false);
  assert.equal(canDismissUpdate(false), true);
  assert.equal(canDismissUpdate(undefined), true);
  assert.equal(UPDATE_DOWNLOAD_FEEDBACK_MS, 1000);
});
