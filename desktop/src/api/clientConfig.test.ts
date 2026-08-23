import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQuery } from './clientQuery.ts';

test('buildQuery skips undefined values and encodes reserved characters', () => {
  assert.equal(buildQuery({}), '');
  assert.equal(buildQuery({ page: 1, q: undefined }), '?page=1');
  assert.equal(buildQuery({ q: 'kz a', region: 'AS' }), '?q=kz%20a&region=AS');
});
