import assert from 'node:assert/strict';
import test from 'node:test';
import { clampCardMinWidth, parsePersistedAppState, serializePersistedAppState } from './appPersist.ts';

test('serializePersistedAppState only keeps the stored desktop fields', () => {
  const snapshot = serializePersistedAppState({
    favorites: ['1.1.1.1:27015'],
    apiBaseUrl: 'https://servers.upkk.com',
    selectedRegion: 'all',
    selectedGameType: 'cs2',
    selectedContinent: 'EU',
    selectedGeoRegion: 'all',
    selectedCountry: 'de',
    viewMode: 'list',
    perPage: 40,
    cardMinWidth: 320,
  });
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'apiBaseUrl', 'cardMinWidth', 'favorites', 'perPage',
    'selectedContinent', 'selectedCountry', 'selectedGameType',
    'selectedGeoRegion', 'selectedRegion', 'viewMode',
  ]);
  assert.equal(snapshot.viewMode, 'list');
  assert.deepEqual(snapshot.favorites, ['1.1.1.1:27015']);
});

test('clampCardMinWidth steps and clamps to the existing card width bounds', () => {
  assert.equal(clampCardMinWidth(undefined), 320);
  assert.equal(clampCardMinWidth('nope'), 320);
  assert.equal(clampCardMinWidth(330), 340);
  assert.equal(clampCardMinWidth(259), 260);
  assert.equal(clampCardMinWidth(461), 460);
  assert.equal(clampCardMinWidth('300'), 300);
});

test('parsePersistedAppState keeps the existing defaults and stored overrides', () => {
  const empty = parsePersistedAppState({});
  assert.deepEqual(empty.favorites, []);
  assert.equal(empty.apiBaseUrl, 'https://servers.upkk.com');
  assert.equal(empty.selectedGameType, 'cs2');
  assert.equal(empty.viewMode, 'card');
  assert.equal(empty.perPage, 20);
  assert.equal(empty.cardMinWidth, 320);
  const parsed = parsePersistedAppState({
    favorites: ['1.1.1.1:27015'],
    selectedContinent: 'EU',
    viewMode: 'list',
    perPage: 40,
    cardMinWidth: 330,
  });
  assert.deepEqual(parsed.favorites, ['1.1.1.1:27015']);
  assert.equal(parsed.selectedContinent, 'EU');
  assert.equal(parsed.viewMode, 'list');
  assert.equal(parsed.perPage, 40);
  assert.equal(parsed.cardMinWidth, 340);
});
