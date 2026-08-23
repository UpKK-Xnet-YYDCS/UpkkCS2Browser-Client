import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAutoUpdatePrompt } from './updatePrompt.ts';

test('resolveAutoUpdatePrompt prompts, respects dismissals, and keeps mandatory updates', () => {
  const dismissed = (version: string) => version === '1.2.3';
  assert.deepEqual(
    resolveAutoUpdatePrompt({ hasUpdate: true, updateInfo: { version: '1.2.4' } }, dismissed),
    { kind: 'prompt', info: { version: '1.2.4' } },
  );
  assert.deepEqual(
    resolveAutoUpdatePrompt({ hasUpdate: true, updateInfo: { version: '1.2.3' } }, dismissed),
    { kind: 'dismissed', version: '1.2.3' },
  );
  assert.deepEqual(
    resolveAutoUpdatePrompt({ hasUpdate: true, updateInfo: { version: '1.2.3', mandatory: true } }, dismissed),
    { kind: 'prompt', info: { version: '1.2.3', mandatory: true } },
  );
  assert.deepEqual(
    resolveAutoUpdatePrompt({ hasUpdate: false, error: 'timeout' }, dismissed),
    { kind: 'error', error: 'timeout' },
  );
  assert.deepEqual(resolveAutoUpdatePrompt({ hasUpdate: false }, dismissed), { kind: 'none' });
});

