import assert from 'node:assert/strict';
import test from 'node:test';
import {
  favoriteAddressIndex,
  resolveVisibleFavoriteReorder,
  swapFavoriteServers,
} from './homeFavoriteReorder.ts';
import {
  favoritePageItemIndex,
  favoriteReorderTargetIndex,
  paginateFavoriteRows,
  swapFavoriteOrder,
} from '../services/favoritePagination.ts';
import type { ServerStatus } from '../types/index.ts';

function server(ip: string): ServerStatus {
  return { ip, port: '27015', name: ip } as ServerStatus;
}

function applyReorder(favorites: readonly string[], from: number, to: number): string[] {
  // Same swap as the REORDER_FAVORITES reducer.
  const next = [...favorites];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

const favorites = ['10.0.0.1:27015', '10.0.0.2:27015', '10.0.0.3:27015', '10.0.0.4:27015', '10.0.0.5:27015'];
const favServers = favorites.map(address => server(address.split(':')[0]));

test('unfiltered lists map to the same indexes as before', () => {
  const perPage = 2;
  for (let page = 1; page <= 3; page += 1) {
    paginateFavoriteRows(favServers, page, perPage).forEach((_, index) => {
      for (const direction of ['up', 'down'] as const) {
        const globalIndex = favoritePageItemIndex(page, perPage, index);
        const swapIndex = favoriteReorderTargetIndex(globalIndex, direction, favorites.length);
        const move = resolveVisibleFavoriteReorder(favServers, globalIndex, direction, favorites);
        if (swapIndex === null) {
          assert.equal(move, null);
          continue;
        }
        assert.deepEqual([move?.from, move?.to], [globalIndex, swapIndex]);
        assert.deepEqual(
          swapFavoriteServers(favServers, move!.source, move!.neighbour),
          swapFavoriteOrder(favServers, globalIndex, direction),
        );
      }
    });
  }
});

test('filtered lists swap the clicked server with its visible neighbour', () => {
  // 10.0.0.2 and 10.0.0.4 are hidden (e.g. offline).
  const visible = [favServers[0], favServers[2], favServers[4]];

  const up = resolveVisibleFavoriteReorder(visible, 1, 'up', favorites);
  assert.deepEqual([up?.from, up?.to], [2, 0]);
  assert.deepEqual(applyReorder(favorites, up!.from, up!.to), [
    '10.0.0.3:27015', '10.0.0.2:27015', '10.0.0.1:27015', '10.0.0.4:27015', '10.0.0.5:27015',
  ]);
  assert.deepEqual(
    swapFavoriteServers(favServers, up!.source, up!.neighbour)?.map(entry => entry.ip),
    ['10.0.0.3', '10.0.0.2', '10.0.0.1', '10.0.0.4', '10.0.0.5'],
  );

  const down = resolveVisibleFavoriteReorder(visible, 1, 'down', favorites);
  assert.deepEqual([down?.from, down?.to], [2, 4]);

  assert.equal(resolveVisibleFavoriteReorder(visible, 0, 'up', favorites), null);
  assert.equal(resolveVisibleFavoriteReorder(visible, 2, 'down', favorites), null);
});

test('filtered pages resolve across the page boundary', () => {
  const visible = [favServers[0], favServers[2], favServers[4]];
  const perPage = 2;
  const firstOnPageTwo = favoritePageItemIndex(2, perPage, 0);
  const move = resolveVisibleFavoriteReorder(visible, firstOnPageTwo, 'up', favorites);
  assert.deepEqual([move?.from, move?.to], [4, 2]);
});

test('favorites are matched by parsed address and unknown servers are ignored', () => {
  assert.equal(favoriteAddressIndex([' 10.0.0.9 : 27015 ', '10.0.0.1:27015'], server('10.0.0.9')), 0);
  assert.equal(favoriteAddressIndex(['not-an-address', '10.0.0.1:27015'], server('10.0.0.1')), 1);
  assert.equal(favoriteAddressIndex(favorites, server('10.9.9.9')), -1);
  assert.equal(resolveVisibleFavoriteReorder([server('10.9.9.9'), favServers[0]], 0, 'down', favorites), null);
  assert.equal(swapFavoriteServers(favServers, server('10.9.9.9'), favServers[0]), null);
});
