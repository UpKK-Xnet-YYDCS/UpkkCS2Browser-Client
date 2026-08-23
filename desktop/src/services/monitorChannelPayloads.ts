import type { MatchedServer } from './monitorTypes.ts';
import { DEFAULT_ALERT_TITLE } from './monitorTypes.ts';
import { formatNotificationMessage, getMapPreviewUrl } from './monitorMessage.ts';

export const DISCORD_EMBED_COLOR = 0x5865F2;
export const SERVER_CHAN_SEND_KEY = /^[A-Za-z0-9]+$/;

export function isTauriHttpModuleError(error: unknown): boolean {
  const errMsg = error instanceof Error ? error.message : String(error);
  return errMsg.includes('module')
    || errMsg.includes('import')
    || errMsg.includes('Cannot find')
    || errMsg.includes('Failed to resolve');
}

export function isWebhookAccepted(response: { ok: boolean; status: number }): boolean {
  return response.ok || response.status === 204;
}

export function isServerChanAccepted(response: { ok: boolean }): boolean {
  return response.ok;
}

export function isValidServerChanSendKey(sendKey: string): boolean {
  return SERVER_CHAN_SEND_KEY.test(sendKey);
}

export function buildDiscordWebhookBody(
  server: MatchedServer,
  alertTitle?: string,
  now: () => Date = () => new Date(),
) {
  const title = alertTitle
    ? formatNotificationMessage(alertTitle, server)
    : DEFAULT_ALERT_TITLE;

  return {
    embeds: [{
      title,
      color: DISCORD_EMBED_COLOR,
      fields: [
        { name: '🖥️ Server', value: server.serverName, inline: true },
        { name: '🗺️ Map', value: server.mapName, inline: true },
        { name: '👥 Players', value: server.players + '/' + server.maxPlayers, inline: true },
        { name: '📍 Address', value: server.serverKey, inline: true },
        { name: '📋 Rule', value: server.matchedRule, inline: true },
        { name: '🔍 Pattern', value: server.matchedPattern, inline: true },
      ],
      image: { url: getMapPreviewUrl(server.mapName) },
      timestamp: now().toISOString(),
      footer: { text: 'XProj Server Monitor' },
    }],
  };
}

export function buildServerChanRequest(
  sendKey: string,
  server: MatchedServer,
  alertTitle?: string,
  now: () => Date = () => new Date(),
) {
  const resolvedTitle = alertTitle
    ? formatNotificationMessage(alertTitle, server)
    : '🎮 ' + server.serverName + ' - ' + server.mapName;
  const despHeading = alertTitle
    ? formatNotificationMessage(alertTitle, server)
    : 'Server Map Alert';
  const desp = [
    '## ' + despHeading,
    '',
    '| Info | Detail |',
    '| --- | --- |',
    '| 🖥️ Server | ' + server.serverName + ' |',
    '| 🗺️ Map | ' + server.mapName + ' |',
    '| 👥 Players | ' + server.players + '/' + server.maxPlayers + ' |',
    '| 📍 Address | ' + server.serverKey + ' |',
    '| 📋 Rule | ' + server.matchedRule + ' |',
    '| 🔍 Pattern | ' + server.matchedPattern + ' |',
    '',
    '> XProj Server Monitor — ' + now().toLocaleString(),
  ].join('\n');

  return {
    url: 'https://sctapi.ftqq.com/' + encodeURIComponent(sendKey) + '.send',
    body: { title: resolvedTitle, desp },
  };
}

export function buildCustomWebhookPayload(
  server: MatchedServer,
  customMessage?: string,
  now: () => Date = () => new Date(),
) {
  return {
    event: 'map_alert',
    server_name: server.serverName,
    map_name: server.mapName,
    players: server.players,
    max_players: server.maxPlayers,
    address: server.serverKey,
    rule_name: server.matchedRule,
    matched_pattern: server.matchedPattern,
    timestamp: now().toISOString(),
    message: customMessage || formatNotificationMessage('', server),
    map_image_url: getMapPreviewUrl(server.mapName),
  };
}

