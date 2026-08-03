import assert from 'node:assert/strict';
import test from 'node:test';
import { BoundedLruMap } from './boundedLru.ts';

test('bounded LRU evicts the least recently used entry', () => {
  const cache = new BoundedLruMap<string, number>(2);
  cache.set('one', 1);
  cache.set('two', 2);
  assert.equal(cache.get('one'), 1);
  cache.set('three', 3);
  assert.equal(cache.get('two'), undefined);
  assert.equal(cache.get('one'), 1);
  assert.equal(cache.get('three'), 3);
  assert.equal(cache.size, 2);
});

test('bounded LRU updates existing entries without growing', () => {
  const cache = new BoundedLruMap<string, number>(1);
  cache.set('one', 1);
  cache.set('one', 2);
  assert.equal(cache.size, 1);
  assert.equal(cache.get('one'), 2);
});
