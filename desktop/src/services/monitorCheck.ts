import { isTauriAvailable } from './a2s.ts';
import { buildJoinUrl } from './steamClient.ts';
import { compileMapPattern, queryMonitorServers, type MonitorServerInfo } from './monitorQuery.ts';
import { dispatchMonitorNotificationsInOrder, type MonitorNotificationSenders } from './monitorNotifications.ts';
import {
  formatNotificationMessage,
  sendCustomWebhook,
  sendDesktopNotification,
  sendDiscordWebhook,
  sendServerChanNotification,
} from './monitorChannels.ts';
import type { MatchedServer, MonitorNotifySettings, MonitorRule } from './monitorTypes';
import {
  evaluateMatchGate,
  recordMatchNotification,
  resetConsecutiveMatch,
  updatePreviousSeenMap,
} from './monitorMatchState.ts';

export interface MonitorCheckResult {
  matched: MatchedServer[];
  currentMatches: MatchedServer[];
  autoJoined: MatchedServer | null;
  error: string | null;
  servers: MonitorServerInfo[];
}

export interface MonitorCheckDependencies {
  queryServers?: typeof queryMonitorServers;
  notify?: (entries: readonly MatchedServer[]) => Promise<void>;
  openJoinUrl?: (url: string) => Promise<void>;
  loadSettings?: () => MonitorNotifySettings;
  /** True once the monitoring run this check belongs to was stopped or restarted. */
  isCancelled?: () => boolean;
}

const emptyMonitorCheck = (): MonitorCheckResult => ({
  matched: [],
  currentMatches: [],
  autoJoined: null,
  error: null,
  servers: [],
});

async function openMonitorJoinUrl(url: string): Promise<void> {
  if (isTauriAvailable()) {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
    return;
  }
  window.location.href = url;
}

async function monitorNotificationSenders(
  notifySettings: MonitorNotifySettings,
): Promise<MonitorNotificationSenders<MatchedServer>> {
  return {
    desktop: async (entry) => {
      const customMsg = formatNotificationMessage(notifySettings.customMessageTemplate, entry);
      const resolvedAlertTitle = notifySettings.alertTitle || undefined;
      const desktopTitle = resolvedAlertTitle
        ? formatNotificationMessage(resolvedAlertTitle, entry)
        : `🎮 ${entry.serverName}`;
      await sendDesktopNotification(desktopTitle, customMsg);
    },
    discord: async (entry) => sendDiscordWebhook(
      notifySettings.discordWebhookUrl, entry, notifySettings.alertTitle || undefined,
    ),
    serverChan: async (entry) => sendServerChanNotification(
      notifySettings.serverChanKey, entry, notifySettings.alertTitle || undefined,
    ),
    customWebhook: async (entry) => sendCustomWebhook(
      notifySettings.customWebhookUrl,
      entry,
      formatNotificationMessage(notifySettings.customMessageTemplate, entry),
    ),
  };
}

export async function performMonitorCheck(
  rules: MonitorRule[],
  dependencies: MonitorCheckDependencies = {},
): Promise<MonitorCheckResult> {
  const queryServers = dependencies.queryServers ?? queryMonitorServers;
  const openJoinUrl = dependencies.openJoinUrl ?? openMonitorJoinUrl;
  const loadSettings = dependencies.loadSettings ?? (await import('./monitorPersistence.ts')).loadNotifySettings;
  const isCancelled = dependencies.isCancelled ?? (() => false);
  const enabledRules = rules.filter(r => r.enabled && r.mapPatterns.length > 0);
  if (enabledRules.length === 0) {
    return emptyMonitorCheck();
  }

  // Load global notification settings
  const notifySettings = loadSettings();

  try {
    // Collect all selected server keys across rules
    const allSelectedKeys = new Set<string>();
    for (const rule of enabledRules) {
      for (const s of rule.selectedServers) allSelectedKeys.add(s);
    }

    if (allSelectedKeys.size === 0) {
      return emptyMonitorCheck();
    }

    const allServers = await queryServers(allSelectedKeys);

    // A check cancelled while querying leaves no trace: no consecutive-match
    // counts, cooldowns, auto-join or notifications.
    if (allServers.length === 0 || isCancelled()) {
      return emptyMonitorCheck();
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

            // Auto-join the first match without waiting for notification delivery.
            if (rule.autoJoin && !autoJoined && !isCancelled()) {
              const [ip, port] = serverKey.split(':');
              const steamUrl = buildJoinUrl(ip, port, undefined, server.gameName);
              try {
                await openJoinUrl(steamUrl);
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

    if (matched.length > 0 && !isCancelled()) {
      if (dependencies.notify) {
        await dependencies.notify(matched);
      } else {
        await dispatchMonitorNotificationsInOrder(matched, {
          desktop: notifySettings.notifyDesktop,
          discord: notifySettings.notifyDiscord && Boolean(notifySettings.discordWebhookUrl),
          serverChan: notifySettings.notifyServerChan && Boolean(notifySettings.serverChanKey),
          customWebhook: notifySettings.notifyCustomWebhook && Boolean(notifySettings.customWebhookUrl),
        }, await monitorNotificationSenders(notifySettings));
      }
    }

    return { matched, currentMatches, autoJoined, error: null, servers: allServers };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Monitor] Check failed:', errorMsg);
    return { matched: [], currentMatches: [], autoJoined: null, error: errorMsg, servers: [] };
  }
}
