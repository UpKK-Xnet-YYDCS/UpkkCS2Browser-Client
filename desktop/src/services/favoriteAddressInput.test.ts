import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADD_FAVORITE_FAILURE_MESSAGE,
  DEFAULT_FAVORITE_SERVER_PORT,
  favoriteAddDisplayName,
  favoriteAddFailureMessage,
  parseFavoriteAddressInput,
} from './favoriteAddressInput.ts';

test('parseFavoriteAddressInput defaults the Source port and keeps the raw trimmed address', () => {
  assert.equal(parseFavoriteAddressInput(''), null);
  assert.equal(parseFavoriteAddressInput('   '), null);
  assert.equal(parseFavoriteAddressInput('  :27015'), null);
  assert.deepEqual(parseFavoriteAddressInput('1.1.1.1'), {
    ip: '1.1.1.1',
    port: DEFAULT_FAVORITE_SERVER_PORT,
    raw: '1.1.1.1',
  });
  assert.deepEqual(parseFavoriteAddressInput('  8.8.8.8:27016  '), {
    ip: '8.8.8.8',
    port: '27016',
    raw: '8.8.8.8:27016',
  });
  assert.deepEqual(parseFavoriteAddressInput('host:'), {
    ip: 'host',
    port: DEFAULT_FAVORITE_SERVER_PORT,
    raw: 'host:',
  });
  assert.deepEqual(parseFavoriteAddressInput('host: 27017'), {
    ip: 'host',
    port: '27017',
    raw: 'host: 27017',
  });
});

test('favorite add helpers keep the raw address fallback and Failed to add copy', () => {
  assert.equal(favoriteAddDisplayName('  Box  ', '1.1.1.1'), 'Box');
  assert.equal(favoriteAddDisplayName('   ', '1.1.1.1:27015'), '1.1.1.1:27015');
  assert.equal(favoriteAddFailureMessage({ error: 'taken' }), 'taken');
  assert.equal(favoriteAddFailureMessage({ success: false }), ADD_FAVORITE_FAILURE_MESSAGE);
  assert.equal(favoriteAddFailureMessage({ error: '' }), ADD_FAVORITE_FAILURE_MESSAGE);
});
