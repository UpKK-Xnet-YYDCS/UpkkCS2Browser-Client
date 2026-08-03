import assert from 'node:assert/strict';
import test from 'node:test';
import { CacheNamespace } from './cacheNamespace.ts';

test('cache keys isolate API origin and authentication scope', () => {
  const namespace = new CacheNamespace();
  const endpoint = '/api/favorites';
  assert.notEqual(
    namespace.key('https://one.example', false, endpoint),
    namespace.key('https://two.example', false, endpoint),
  );
  assert.notEqual(
    namespace.key('https://one.example', false, endpoint),
    namespace.key('https://one.example', true, endpoint),
  );
});

test('invalidating a cache namespace isolates consecutive authenticated users', () => {
  const namespace = new CacheNamespace();
  const before = namespace.key('https://one.example', true, '/api/favorites');
  namespace.invalidate();
  const after = namespace.key('https://one.example', true, '/api/favorites');
  assert.notEqual(after, before);
});
