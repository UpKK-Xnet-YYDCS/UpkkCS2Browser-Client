import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_ALERT_TITLE, DEFAULT_MESSAGE_TEMPLATE } from './monitorTypes.ts';
import type { MatchedServer } from './monitorTypes.ts';
import { formatNotificationMessage } from './monitorMessage.ts';
import {
  DISCORD_EMBED_COLOR,
  buildCustomWebhookPayload,
  buildDiscordWebhookBody,
  buildServerChanRequest,
  isServerChanAccepted,
  isTauriHttpModuleError,
  isValidServerChanSendKey,
  isWebhookAccepted,
} from './monitorChannelPayloads.ts';

const server: MatchedServer = {
  serverKey: '127.0.0.1:27015',
  serverName: 'My Server',
  mapName: 'ze_example',
  players: 12,
  maxPlayers: 64,
  matchedRule: 'ZE',
  matchedPattern: 'ze_*',
  matchedAt: '2026-01-01T00:00:00.000Z',
};

const now = () => new Date('2026-01-02T03:04:05.000Z');

test('Discord embed keeps blurple, emoji fields, footer, and default title', () => {
  const body = buildDiscordWebhookBody(server, undefined, now);
  assert.equal(body.embeds.length, 1);
  const embed = body.embeds[0];
  assert.equal(embed.title, DEFAULT_ALERT_TITLE);
  assert.equal(embed.color, DISCORD_EMBED_COLOR);
  assert.equal(embed.color, 0x5865F2);
  assert.deepEqual(embed.fields.map((field) => field.name), [
    '🖥️ Server',
    '🗺️ Map',
    '👥 Players',
    '📍 Address',
    '📋 Rule',
    '🔍 Pattern',
  ]);
  assert.deepEqual(embed.fields.map((field) => field.value), [
    'My Server',
    'ze_example',
    '12/64',
    '127.0.0.1:27015',
    'ZE',
    'ze_*',
  ]);
  assert.equal(embed.fields.every((field) => field.inline), true);
  assert.equal(embed.image.url, 'https://servers.upkk.com/mapimage/ze_example.webp');
  assert.equal(embed.timestamp, '2026-01-02T03:04:05.000Z');
  assert.equal(embed.footer.text, 'XProj Server Monitor');
});

test('Discord embed formats a custom title through the message template', () => {
  const body = buildDiscordWebhookBody(server, '{servername} / {mapname}', now);
  assert.equal(body.embeds[0].title, 'My Server / ze_example');
});

test('Server酱 sendKey only allows alphanumeric tokens', () => {
  assert.equal(isValidServerChanSendKey('SCT123abc'), true);
  assert.equal(isValidServerChanSendKey(''), false);
  assert.equal(isValidServerChanSendKey('SCT-123'), false);
  assert.equal(isValidServerChanSendKey('SCT 123'), false);
});

test('Server酱 request encodes sendKey and keeps the markdown table', () => {
  const request = buildServerChanRequest('SCT123', server, undefined, now);
  assert.equal(request.url, 'https://sctapi.ftqq.com/SCT123.send');
  assert.equal(request.body.title, '🎮 My Server - ze_example');
  assert.equal(request.body.desp.includes('## Server Map Alert'), true);
  assert.equal(request.body.desp.includes('| 🖥️ Server | My Server |'), true);
  assert.equal(request.body.desp.includes('| 🗺️ Map | ze_example |'), true);
  assert.equal(request.body.desp.includes('| 👥 Players | 12/64 |'), true);
  assert.equal(request.body.desp.includes('| 📍 Address | 127.0.0.1:27015 |'), true);
  assert.equal(request.body.desp.includes('| 📋 Rule | ZE |'), true);
  assert.equal(request.body.desp.includes('| 🔍 Pattern | ze_* |'), true);
  assert.equal(request.body.desp.includes('> XProj Server Monitor — ' + now().toLocaleString()), true);
});

test('custom webhook keeps snake_case fields and formats an empty template', () => {
  const payload = buildCustomWebhookPayload(server, '', now);
  assert.equal(payload.event, 'map_alert');
  assert.equal(payload.server_name, 'My Server');
  assert.equal(payload.map_name, 'ze_example');
  assert.equal(payload.players, 12);
  assert.equal(payload.max_players, 64);
  assert.equal(payload.address, '127.0.0.1:27015');
  assert.equal(payload.rule_name, 'ZE');
  assert.equal(payload.matched_pattern, 'ze_*');
  assert.equal(payload.timestamp, '2026-01-02T03:04:05.000Z');
  assert.equal(payload.message, formatNotificationMessage('', server));
  assert.notEqual(payload.message, DEFAULT_MESSAGE_TEMPLATE);
  assert.equal(payload.map_image_url, 'https://servers.upkk.com/mapimage/ze_example.webp');
});

test('module-error detection only matches import resolution failures', () => {
  assert.equal(isTauriHttpModuleError(new Error('Cannot find module')), true);
  assert.equal(isTauriHttpModuleError('Failed to resolve @tauri-apps/plugin-http'), true);
  assert.equal(isTauriHttpModuleError(new Error('import failed')), true);
  assert.equal(isTauriHttpModuleError(new Error('network timeout')), false);
  assert.equal(isTauriHttpModuleError(new Error('HTTP 500')), false);
});

test('Discord/custom accept 204; Server酱 only accepts response.ok', () => {
  assert.equal(isWebhookAccepted({ ok: true, status: 200 }), true);
  assert.equal(isWebhookAccepted({ ok: false, status: 204 }), true);
  assert.equal(isWebhookAccepted({ ok: false, status: 400 }), false);
  assert.equal(isServerChanAccepted({ ok: true }), true);
  assert.equal(isServerChanAccepted({ ok: false }), false);
});
