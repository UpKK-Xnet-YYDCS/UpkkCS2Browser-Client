import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FAVORITES_PAGE_SIZE_OPTIONS,
  favoritePageCount,
  favoritePageItemIndex,
  favoriteReorderTargetIndex,
  favoriteSortOrders,
  favoriteVisiblePages,
  paginateFavoriteRows,
  readAutoRefreshInterval,
  readFavoritesPageSize,
  readFavoritesViewMode,
  searchFavoriteRows,
  swapFavoriteOrder,
  isFavoritesAuthError,
  favoriteAddressSetChanged,
  nextAutoRefreshCountdown,
} from './favoritesPageQuery.ts';

function row(overrides: Record<string, string> = {}) {
  return {
    fav: {
      current_name: 'Alpha',
      server_name: 'Legacy',
      server_ip: '1.1.1.1',
      server_port: '27015',
      map_name: 'ze_map',
      category: 'ze',
      ...overrides,
    },
  };
}

test('storage readers keep the existing fallbacks and list-only view mode', () => {
  assert.equal(readFavoritesPageSize(null), FAVORITES_PAGE_SIZE_OPTIONS[0]);
  assert.equal(readFavoritesPageSize('24'), 24);
  assert.equal(readFavoritesViewMode(null), 'card');
  assert.equal(readFavoritesViewMode('list'), 'list');
  assert.equal(readFavoritesViewMode('other'), 'card');
  assert.equal(readAutoRefreshInterval(null), 60);
  assert.equal(readAutoRefreshInterval('90'), 90);
});

test('searchFavoriteRows matches name, address, map, and category', () => {
  const rows = [
    row(),
    row({ current_name: '', server_name: 'Bravo', server_ip: '8.8.8.8', server_port: '27016', map_name: 'de_dust', category: 'dm' }),
  ];
  assert.equal(searchFavoriteRows(rows, '  ').length, 2);
  assert.equal(searchFavoriteRows(rows, 'alpha')[0].fav.server_ip, '1.1.1.1');
  assert.equal(searchFavoriteRows(rows, '8.8.8.8:27016').length, 1);
  assert.equal(searchFavoriteRows(rows, 'de_dust')[0].fav.category, 'dm');
  assert.equal(searchFavoriteRows(rows, 'ze').length, 1);
});

test('pagination helpers keep a minimum of one page and a 5-number window', () => {
  assert.equal(favoritePageCount(0, 12), 1);
  assert.equal(favoritePageCount(25, 12), 3);
  assert.equal(favoritePageItemIndex(1, 12, 0), 0);
  assert.equal(favoritePageItemIndex(2, 12, 3), 15);
  assert.deepEqual(paginateFavoriteRows(['a', 'b', 'c', 'd'], 2, 2), ['c', 'd']);
  assert.deepEqual(favoriteVisiblePages(1, 3), [1, 2, 3]);
  assert.deepEqual(favoriteVisiblePages(1, 9), [1, 2, 3, 4, 5]);
  assert.deepEqual(favoriteVisiblePages(5, 9), [3, 4, 5, 6, 7]);
  assert.deepEqual(favoriteVisiblePages(9, 9), [5, 6, 7, 8, 9]);
});

test('favoriteReorderTargetIndex stays inside the current list', () => {
  assert.equal(favoriteReorderTargetIndex(0, 'up', 3), null);
  assert.equal(favoriteReorderTargetIndex(0, 'down', 3), 1);
  assert.equal(favoriteReorderTargetIndex(2, 'down', 3), null);
  assert.equal(favoriteReorderTargetIndex(2, 'up', 3), 1);
});

test('swapFavoriteOrder and sort payloads stay in source order', () => {
  assert.equal(swapFavoriteOrder(['a', 'b', 'c'], 0, 'up'), null);
  assert.deepEqual(swapFavoriteOrder(['a', 'b', 'c'], 1, 'up'), ['b', 'a', 'c']);
  assert.deepEqual(swapFavoriteOrder(['a', 'b', 'c'], 1, 'down'), ['a', 'c', 'b']);
  assert.deepEqual(
    favoriteSortOrders([
      { server_ip: '1.1.1.1', server_port: '27015' },
      { server_ip: '2.2.2.2', server_port: '27016' },
    ]),
    [
      { server_ip: '1.1.1.1', server_port: '27015', sort_order: 0 },
      { server_ip: '2.2.2.2', server_port: '27016', sort_order: 1 },
    ],
  );
});


test('favorite membership changes ignore reorder and detect add or remove', () => {
  assert.equal(favoriteAddressSetChanged(['a', 'b'], ['b', 'a']), false);
  assert.equal(favoriteAddressSetChanged(['a', 'b'], ['a', 'b', 'c']), true);
  assert.equal(favoriteAddressSetChanged(['a', 'b'], ['a']), true);
  assert.equal(isFavoritesAuthError('Request failed 401'), true);
  assert.equal(isFavoritesAuthError('Not logged in'), true);
  assert.equal(isFavoritesAuthError('timeout'), false);
});

test('auto-refresh countdown only fires when the remaining second elapses', () => {
  assert.deepEqual(nextAutoRefreshCountdown(3, 60), { next: 2, shouldRefresh: false });
  assert.deepEqual(nextAutoRefreshCountdown(1, 60), { next: 60, shouldRefresh: true });
  assert.deepEqual(nextAutoRefreshCountdown(0, 45), { next: 45, shouldRefresh: true });
});
