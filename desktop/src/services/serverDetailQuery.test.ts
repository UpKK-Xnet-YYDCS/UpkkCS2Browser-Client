import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SERVER_DETAIL_COPY_FEEDBACK_MS,
  buildServerDetailHistoryKeys,
  cloudFavoriteClickAction,
  playersQueryKey,
  shouldPrefetchCloudFavorite,
  shouldPrefetchPlayers,
  shouldPrefetchServerVersion,
} from './serverDetailQuery.ts';

test('history keys prefer server ID and only join a complete address', () => {
  assert.deepEqual(buildServerDetailHistoryKeys(42, '1.1.1.1', '27015'), {
    joinedAddress: '1.1.1.1:27015',
    historyServerId: '42',
    historyAddress: '1.1.1.1:27015',
  });
  assert.deepEqual(buildServerDetailHistoryKeys('', '1.1.1.1', '27015'), {
    joinedAddress: '1.1.1.1:27015',
    historyServerId: '1.1.1.1:27015',
    historyAddress: '1.1.1.1:27015',
  });
  assert.deepEqual(buildServerDetailHistoryKeys(1, '1.1.1.1', ''), {
    joinedAddress: '',
    historyServerId: '1',
    historyAddress: '',
  });
  assert.equal(playersQueryKey(9, '8.8.8.8', '27016'), 9);
  assert.equal(playersQueryKey('', '8.8.8.8', '27016'), '8.8.8.8:27016');
});

test('detail prefetch gates keep the existing login, player, and version rules', () => {
  assert.equal(shouldPrefetchCloudFavorite(true, null, '1.1.1.1', '27015'), true);
  assert.equal(shouldPrefetchCloudFavorite(true, false, '1.1.1.1', '27015'), false);
  assert.equal(shouldPrefetchCloudFavorite(false, null, '1.1.1.1', '27015'), false);
  assert.equal(shouldPrefetchCloudFavorite(true, null, '', '27015'), false);
  assert.equal(shouldPrefetchPlayers(1), true);
  assert.equal(shouldPrefetchPlayers(0), false);
  assert.equal(shouldPrefetchServerVersion('', '1.1.1.1', '27015'), true);
  assert.equal(shouldPrefetchServerVersion('1.0', '1.1.1.1', '27015'), false);
  assert.equal(cloudFavoriteClickAction(true), 'confirm-remove');
  assert.equal(cloudFavoriteClickAction(false), 'add');
  assert.equal(cloudFavoriteClickAction(null), 'add');
  assert.equal(SERVER_DETAIL_COPY_FEEDBACK_MS, 2000);
});
