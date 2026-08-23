import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNotificationMessage, getMapPreviewUrl } from './monitorMessage.ts';
import { DEFAULT_MESSAGE_TEMPLATE } from './monitorTypes.ts';
import type { MatchedServer } from './monitorTypes.ts';

const server: MatchedServer = {
  serverKey: '127.0.0.1:27015',
  serverName: 'My Server',
  mapName: 'ze_example',
  players: 12,
  maxPlayers: 64,
  matchedRule: 'ZE',
  matchedPattern: 'ze_*',
  matchedAt: '2026-01-01T00:00:00.000Z',
  autoJoin: false,
};

test('getMapPreviewUrl uses the default host and encodes map names', () => {
  assert.equal(getMapPreviewUrl('', { getItem: () => null }), 'https://servers.upkk.com/mapimage/default_1.webp');
  assert.equal(
    getMapPreviewUrl('ze a', { getItem: () => 'https://api.example' }),
    'https://api.example/mapimage/ze%20a.webp',
  );
});

test('formatNotificationMessage replaces placeholders and falls back to the default template', () => {
  const text = formatNotificationMessage(
    '{servername} {mapname} {players}/{maxplayers} {address} {rulename} {pattern} {time} {mapimage}',
    server,
    () => 'NOW',
  );
  assert.equal(
    text,
    'My Server ze_example 12/64 127.0.0.1:27015 ZE ze_* NOW https://servers.upkk.com/mapimage/ze_example.webp',
  );
  const fallback = formatNotificationMessage('', server, () => 'NOW');
  assert.equal(fallback.includes('My Server'), true);
  assert.equal(fallback.includes('ze_example'), true);
  assert.notEqual(fallback, DEFAULT_MESSAGE_TEMPLATE);
});
