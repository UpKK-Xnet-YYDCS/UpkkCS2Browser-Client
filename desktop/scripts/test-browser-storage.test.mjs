import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('browser storage preloads before application imports without Node warnings', () => {
  const result = spawnSync(process.execPath, [
    '--import', './scripts/test-browser-storage.mjs',
    '--input-type=module',
    '--eval', `
      import { loadPersistedState } from './src/store/appPersist.ts';
      console.log(JSON.stringify(loadPersistedState()));
      localStorage.setItem('preference', 'private to this worker');
    `,
  ], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.trim(), '{}');
  assert.equal(localStorage.getItem('preference'), null);
});
