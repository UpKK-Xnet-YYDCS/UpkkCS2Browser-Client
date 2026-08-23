import assert from 'node:assert/strict';
import test from 'node:test';
import { compareVersions, forceMandatoryIfBelowMinimum, isNewerVersion } from './updateVersion.ts';

test('compareVersions uses numeric semver parts and treats missing segments as zero', () => {
  assert.equal(compareVersions('1.0.1', '1.0.0'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.2', '1.2.0'), 0);
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('1.0.a', '1.0.0'), 0);
});

test('minimum version policy only forces mandatory when current is below min_version', () => {
  assert.equal(isNewerVersion('1.7.1', '1.7.0'), true);
  assert.equal(isNewerVersion('1.7.0', '1.7.0'), false);
  const forced = forceMandatoryIfBelowMinimum({ version: '2.0.0', min_version: '1.8.0', mandatory: false }, '1.7.0');
  assert.equal(forced.mandatory, true);
  const kept = forceMandatoryIfBelowMinimum({ version: '1.8.0', min_version: '1.7.0', mandatory: false }, '1.7.0');
  assert.equal(kept.mandatory, false);
  const untouched = forceMandatoryIfBelowMinimum({ version: '1.8.0', mandatory: false }, '1.0.0');
  assert.equal(untouched.mandatory, false);
});
