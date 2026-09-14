import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('legacy API barrel re-exports split modules and does not keep a second client', async () => {
  const source = await readFile(new URL('./index.ts', import.meta.url), 'utf8');
  assert.equal(source.includes("@/store/log"), false);
  assert.equal(source.includes('TtlLruCache'), false);
  assert.equal(source.includes('inflightRequests'), false);
  assert.equal(source.includes('cachedBaseUrl'), false);
  assert.match(source, /from '\.\/client\.ts'/);
  assert.match(source, /from '\.\/servers\.ts'/);
  assert.match(source, /from '\.\/auth\.ts'/);
  assert.match(source, /from '\.\/favorites\.ts'/);
  assert.match(source, /from '\.\/history\.ts'/);
  assert.equal(source.includes('getServers'), true);
  assert.equal(source.includes('setApiBaseUrl'), true);
});
