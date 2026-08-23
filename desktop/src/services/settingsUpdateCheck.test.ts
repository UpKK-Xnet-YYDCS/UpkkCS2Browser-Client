import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SETTINGS_UPDATE_STATUS_RESET_MS,
  resolveManualUpdateCheckStatus,
} from './settingsUpdateCheck.ts';

test('manual update check keeps the existing status and reset timings', () => {
  assert.deepEqual(resolveManualUpdateCheckStatus({ hasUpdate: true }), { status: 'idle', resetMs: null });
  assert.deepEqual(
    resolveManualUpdateCheckStatus({ error: 'network' }),
    { status: 'error', resetMs: SETTINGS_UPDATE_STATUS_RESET_MS },
  );
  assert.deepEqual(
    resolveManualUpdateCheckStatus({ hasUpdate: false }),
    { status: 'upToDate', resetMs: SETTINGS_UPDATE_STATUS_RESET_MS },
  );
  assert.deepEqual(
    resolveManualUpdateCheckStatus(null),
    { status: 'error', resetMs: SETTINGS_UPDATE_STATUS_RESET_MS },
  );
});
