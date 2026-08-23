import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLOUD_USER_CACHE_KEY,
  LEGACY_AUTH_STATUS_KEY,
  cacheAuth,
  loadCachedAuth,
  normalizeCallbackUser,
  parseLoginCallbackPayload,
} from './cloudAuthCache.ts';

test('loadCachedAuth treats missing or invalid cache as logged out', () => {
  assert.deepEqual(loadCachedAuth(null), { logged_in: false });
  assert.deepEqual(loadCachedAuth('null'), { logged_in: false });
  assert.deepEqual(loadCachedAuth('{'), { logged_in: false });
});

test('loadCachedAuth restores a cached user without revalidating the provider', () => {
  const user = { id: 3, username: 'Ada', provider: 'steam' as const };
  assert.deepEqual(loadCachedAuth(JSON.stringify(user)), { logged_in: true, user });
});

test('cacheAuth writes the user and clears both current and legacy keys on logout', () => {
  const storage = new Map<string, string>([[LEGACY_AUTH_STATUS_KEY, 'stale']]);
  const adapter = {
    setItem(key: string, value: string) { storage.set(key, value); },
    removeItem(key: string) { storage.delete(key); },
  };
  const user = { id: 8, username: 'Lin', provider: 'discord' as const };
  cacheAuth({ logged_in: true, user }, adapter);
  assert.equal(storage.get(CLOUD_USER_CACHE_KEY), JSON.stringify(user));
  cacheAuth({ logged_in: false }, adapter);
  assert.equal(storage.has(CLOUD_USER_CACHE_KEY), false);
  assert.equal(storage.has(LEGACY_AUTH_STATUS_KEY), false);
});

test('normalizeCallbackUser keeps the looser OAuth payload rules', () => {
  assert.equal(normalizeCallbackUser(null), undefined);
  assert.equal(normalizeCallbackUser({ username: 'x' }), undefined);
  assert.deepEqual(normalizeCallbackUser({
    id: '12',
    display_name: 'Pat',
    avatar_url: 'https://example.test/a.png',
  }), {
    id: 12,
    username: 'Pat',
    avatar: 'https://example.test/a.png',
    provider: 'steam',
  });
  assert.equal(normalizeCallbackUser({ id: 4, username: 'A', avatar: '' })?.avatar, undefined);
});

test('parseLoginCallbackPayload requires a token and keeps the original error text', () => {
  assert.deepEqual(
    parseLoginCallbackPayload(JSON.stringify({ token: 'abc', user: { id: 1 } })),
    { token: 'abc', user: { id: 1 } },
  );
  assert.throws(
    () => parseLoginCallbackPayload(JSON.stringify({ error: 'denied' })),
    /denied/,
  );
  assert.throws(
    () => parseLoginCallbackPayload(JSON.stringify({})),
    /OAuth callback did not include a token/,
  );
});
