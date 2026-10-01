import assert from 'node:assert/strict';
import test from 'node:test';

import { clearFavoritesResponseCache, favoritesResponseCacheKey } from './favoritesCache.ts';

test('favorites refresh clears only favorite response keys', () => {
  const cleared: string[] = [];
  clearFavoritesResponseCache((endpoint) => {
    cleared.push(endpoint);
  });
  assert.deepEqual(cleared, [favoritesResponseCacheKey]);
});
