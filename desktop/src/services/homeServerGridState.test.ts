import assert from 'node:assert/strict';
import test from 'node:test';
import {
  homeFavoriteGlobalIndex,
  shouldShowHomeGridSkeleton,
  shouldShowHomeLatencyEmpty,
  shouldShowHomeNoFavorites,
  shouldShowHomeNoServers,
} from './homeServerGridState.ts';

test('home skeleton only shows for the active empty list', () => {
  assert.equal(shouldShowHomeGridSkeleton({
    isLoading: true, serversLength: 0, showFavoritesOnly: false, favLoading: false, favServersLength: 0,
  }), true);
  assert.equal(shouldShowHomeGridSkeleton({
    isLoading: true, serversLength: 3, showFavoritesOnly: false, favLoading: false, favServersLength: 0,
  }), false);
  assert.equal(shouldShowHomeGridSkeleton({
    isLoading: true, serversLength: 0, showFavoritesOnly: true, favLoading: false, favServersLength: 0,
  }), false);
  assert.equal(shouldShowHomeGridSkeleton({
    isLoading: false, serversLength: 0, showFavoritesOnly: true, favLoading: true, favServersLength: 0,
  }), true);
  assert.equal(shouldShowHomeGridSkeleton({
    isLoading: false, serversLength: 0, showFavoritesOnly: true, favLoading: true, favServersLength: 2,
  }), false);
});

test('home empty states keep error, favorite, and latency precedence', () => {
  assert.equal(shouldShowHomeNoServers({ isLoading: false, serversLength: 0, error: null }), true);
  assert.equal(shouldShowHomeNoServers({ isLoading: false, serversLength: 0, error: 'fail' }), false);
  assert.equal(shouldShowHomeNoServers({ isLoading: true, serversLength: 0, error: null }), false);
  assert.equal(shouldShowHomeNoFavorites({ favLoading: false, showFavoritesOnly: true, filteredFavLength: 0 }), true);
  assert.equal(shouldShowHomeNoFavorites({ favLoading: true, showFavoritesOnly: true, filteredFavLength: 0 }), false);
  assert.equal(shouldShowHomeNoFavorites({ favLoading: false, showFavoritesOnly: false, filteredFavLength: 0 }), false);
  assert.equal(shouldShowHomeLatencyEmpty({
    isLoading: false, favLoading: false, latencyFilter: '50', displayedLength: 4, displayedWithLatencyLength: 0,
  }), true);
  assert.equal(shouldShowHomeLatencyEmpty({
    isLoading: false, favLoading: false, latencyFilter: 'all', displayedLength: 4, displayedWithLatencyLength: 0,
  }), false);
  assert.equal(shouldShowHomeLatencyEmpty({
    isLoading: false, favLoading: false, latencyFilter: '50', displayedLength: 0, displayedWithLatencyLength: 0,
  }), false);
});

test('favorite reorder index stays page-relative', () => {
  assert.equal(homeFavoriteGlobalIndex(1, 20, 3), 3);
  assert.equal(homeFavoriteGlobalIndex(2, 20, 3), 23);
});

