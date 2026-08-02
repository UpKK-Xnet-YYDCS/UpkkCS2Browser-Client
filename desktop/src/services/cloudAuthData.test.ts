import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCloudAuthResponse } from './cloudAuthData.ts';

test('normalizes the flat Gin current-user response for shared cloud auth', () => {
  assert.deepEqual(normalizeCloudAuthResponse({
    logged_in: true,
    id: 7,
    username: 'cloud-user',
    avatar_url: 'https://example.test/avatar.png',
    provider: 'google',
  }), {
    logged_in: true,
    user: {
      id: 7,
      steam_id: undefined,
      username: 'cloud-user',
      avatar: 'https://example.test/avatar.png',
      provider: 'google',
    },
  });
});

test('normalizes an expired or malformed login as logged out', () => {
  assert.deepEqual(normalizeCloudAuthResponse({ logged_in: false, id: 7 }), { logged_in: false });
  assert.deepEqual(normalizeCloudAuthResponse({ logged_in: true, id: 0 }), { logged_in: false });
});
