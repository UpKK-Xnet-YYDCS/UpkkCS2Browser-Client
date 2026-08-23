import { isTauriAvailable } from '@/services/a2s';
import { buildJoinUrl } from '@/services/steamClient';
import { compileMapPattern, queryMonitorServers } from './monitorQuery.ts';
import { dispatchMonitorNotificationsInOrder } from './monitorNotifications.ts';
import {
  formatNotificationMessage,
  sendCustomWebhook,
  sendDesktopNotification,
  sendDiscordWebhook,
  sendServerChanNotification,
} from './monitorChannels';
import { loadNotifySettings } from './monitorPersistence';
import type { MatchedServer, MonitorRule } from './monitorTypes';
import {
  evaluateMatchGate,
  recordMatchNotification,
  resetConsecutiveMatch,
  updatePreviousSeenMap,
} from './monitorMatchState.ts';

export async function performMonitorCheck(
  rules: MonitorRule[]
): Promise<{ matched: MatchedServer[]; currentMatches: MatchedServer[]; autoJoined: MatchedServer | null; error: string | null }> {
  const enabledRules = rules.filter(r => r.enabled && r.mapPatterns.length > 0);
  if (enabledRules.length === 0) {
    return { matched: [], currentMatches: [], autoJoined: null, error: null };
  }

  // Load global notification settings
  const notifySettings = loadNotifySettings();

  try {
    // Collect all selected server keys across rules
    const allSelectedKeys = new Set<string>();
    for (const rule of enabledRules) {
      for (const s of rule.selectedServers) allSelectedKeys.add(s);
    }

    if (allSelectedKeys.size === 0) {
      return { matched: [], currentMatches: [], autoJoined: null, error: null };
    }

    const allServers = await queryMonitorServers(allSelectedKeys);

    if (allServers.length === 0) {
      return { matched: [], currentMatches: [], autoJoined: null, error: null };
    }

    const matched: MatchedServer[] = [];
    const currentMatches: MatchedServer[] = [];
    let autoJoined: MatchedServer | null = null;

    const preparedRules = enabledRules.map(rule => ({
      rule,
      selectedServers: new Set(rule.selectedServers),
      patterns: rule.mapPatterns.map(pattern => ({ pattern, matches: compileMapPattern(pattern) })),
    }));

    for (const prepared of preparedRules) {
      const { rule } = prepared;
      const serversToCheck = allServers.filter(server => prepared.selectedServers.has(server.key));

      for (const server of serversToCheck) {
        const serverKey = server.key;
        const mapName = server.mapName;
        const players = server.players;
        const maxPlayers = server.maxPlayers;
        const serverName = server.name;

        if (!server.isOnline) continue;
        if (players < rule.minPlayers) continue;

        // Check map patterns
        let patternMatched = false;
        for (const { pattern, matches } of prepared.patterns) {
          if (matches(mapName)) {
            patternMatched = true;

            const matchEntry: MatchedServer = {
              serverKey,
              serverName,
              mapName,
              players,
              maxPlayers,
              matchedRule: rule.name,
              matchedPattern: pattern,
              matchedAt: new Date().toISOString(),
              autoJoin: rule.autoJoin ?? false,
            };

            // Always add to currentMatches (real-time, independent of cooldown)
            currentMatches.push(matchEntry);

            const gate = evaluateMatchGate({
              ruleId: rule.id,
              serverKey,
              mapName,
              requiredMatches: rule.requiredMatches ?? 1,
              cooldownSeconds: rule.cooldownSeconds,
            });
            if (gate !== 'notify') continue;

            matched.push(matchEntry);
            recordMatchNotification(rule.id, serverKey, mapName);

            // Send notifications using global settings (all async, errors won't interrupt monitoring)
            const customMsg = formatNotificationMessage(notifySettings.customMessageTemplate, matchEntry);
            const resolvedAlertTitle = notifySettings.alertTitle || undefined;

            await dispatchMonitorNotificationsInOrder([matchEntry], {
              desktop: notifySettings.notifyDesktop,
              discord: notifySettings.notifyDiscord && Boolean(notifySettings.discordWebhookUrl),
              serverChan: notifySettings.notifyServerChan && Boolean(notifySettings.serverChanKey),
              customWebhook: notifySettings.notifyCustomWebhook && Boolean(notifySettings.customWebhookUrl),
            }, {
              desktop: async () => {
                const desktopTitle = resolvedAlertTitle
                  ? formatNotificationMessage(resolvedAlertTitle, matchEntry)
                  : `🎮 ${serverName}`;
                await sendDesktopNotification(desktopTitle, customMsg);
              },
              discord: async () => sendDiscordWebhook(
                notifySettings.discordWebhookUrl, matchEntry, resolvedAlertTitle,
              ),
              serverChan: async () => sendServerChanNotification(
                notifySettings.serverChanKey, matchEntry, resolvedAlertTitle,
              ),
              customWebhook: async () => sendCustomWebhook(
                notifySettings.customWebhookUrl, matchEntry, customMsg,
              ),
            });

            // Auto-join: open Steam to connect to the FIRST matched server only
            if (rule.autoJoin && !autoJoined) {
              const [ip, port] = serverKey.split(':');
              const steamUrl = buildJoinUrl(ip, port, undefined, server.gameName);
              try {
                if (isTauriAvailable()) {
                  const { open } = await import('@tauri-apps/plugin-shell');
                  await open(steamUrl);
                } else {
                  window.location.href = steamUrl;
                }
              } catch {
                window.location.href = steamUrl;
              }
              autoJoined = matchEntry;
            }

            break; // Only match first pattern per server per rule
          }
        }
        // If no pattern matched this cycle, reset the consecutive counter
        if (!patternMatched) {
          resetConsecutiveMatch(rule.id, serverKey);
        }
        // Always update the previously seen map for duplicate detection
        updatePreviousSeenMap(rule.id, serverKey, mapName);
      }
    }

    return { matched, currentMatches, autoJoined, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Monitor] Check failed:', errorMsg);
    return { matched: [], currentMatches: [], autoJoined: null, error: errorMsg };
  }
}

