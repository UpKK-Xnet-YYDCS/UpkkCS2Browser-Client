import assert from 'node:assert/strict';
import test from 'node:test';
import { TtlLruCache } from './ttlLruCache.ts';

test('TTL-LRU expires stale entries and keeps fresh entries', () => {
  let now = 1_000;
  const cache = new TtlLruCache<string, number>(2, () => 100, () => now);
  cache.set('one', 1);
  now += 99;
  assert.equal(cache.get('one'), 1);
  now += 1;
  assert.equal(cache.get('one'), undefined);
});

test('TTL-LRU enforces its capacity with least-recently-used eviction', () => {
  const cache = new TtlLruCache<string, number>(2, () => 100);
  cache.set('one', 1);
  cache.set('two', 2);
  cache.get('one');
  cache.set('three', 3);
  assert.equal(cache.get('two'), undefined);
  assert.equal(cache.get('one'), 1);
});
