/**
 * Server Monitor Service
 * 
 * Monitors servers periodically using local A2S queries for real-time data.
 * Triggers notifications when monitored maps are detected on servers:
 * - In-app toast notifications (Telegram-style bottom-right)
 * - Windows desktop notifications (via Notification API, with in-app fallback)
 * - Discord webhook notifications
 */

import { showToast } from '@/components/ToastNotification';
import { parseServerAddress, queryServerA2S, isTauriAvailable } from '@/services/a2s';
import { buildJoinUrl } from '@/components/SteamClientSwitch';

// ============== Types ==============

export interface MonitorRule {
  id: string;
  name: string;
  enabled: boolean;
  // Server selection: only 'selected' mode (specify servers)
  serverMode: 'selected';
  selectedServers: string[]; // "ip:port" keys
  // Map matching: list of map name patterns (supports * wildcard)
  mapPatterns: string[];
  // Player threshold: minimum player count to trigger
  minPlayers: number;
  // Notification channels
  notifyDesktop: boolean;
  notifyDiscord: boolean;
  discordWebhookUrl: string;
  notifyServerChan: boolean;
  serverChanKey: string;
  // Cooldown per server per rule (seconds) to prevent spam
  cooldownSeconds: number;
  // Required consecutive matches before notifying (must detect map N times in a row)
  requiredMatches: number;
  // Auto-join: automatically join the first matched server when rule triggers
  autoJoin: boolean;
  // Created time
  createdAt: string;
}

export interface MonitorStatus {
  isRunning: boolean;
  lastCheckTime: string | null;
  nextCheckTime: string | null;
  matchedServers: MatchedServer[];
  checkCount: number;
  errorCount: number;
  lastError: string | null;
}

export interface MatchedServer {
  serverKey: string; // "ip:port"
  serverName: string;
  mapName: string;
  players: number;
  maxPlayers: number;
  matchedRule: string; // rule name
  matchedPattern: string;
  matchedAt: string;
  autoJoin?: boolean; // whether to auto-join this server
}

// Unified server info used by performMonitorCheck
interface MonitorServerInfo {
  key: string;
  name: string;
  mapName: string;
  players: number;
  maxPlayers: number;
  isOnline: boolean;
  gameName: string;
}

// ============== Storage Keys ==============

export const MONITOR_RULES_KEY = 'xproj_monitor_rules';
const MONITOR_INTERVAL_KEY = 'xproj_monitor_interval';
const MONITOR_ENABLED_KEY = 'xproj_monitor_enabled';
const MONITOR_NOTIFY_KEY = 'xproj_monitor_notify';

// ============== Global Notification Settings ==============

export interface MonitorNotifySettings {
  notifyDesktop: boolean;
  notifyDiscord: boolean;
  discordWebhookUrl: string;
  notifyServerChan: boolean;
  serverChanKey: string;
  notifyCustomWebhook: boolean;
  customWebhookUrl: string;
  customMessageTemplate: string;
  alertTitle: string;
}

/**
 * Available placeholders for custom message templates.
 * Users can use these in their custom message template.
 */
export const MESSAGE_PLACEHOLDERS = [
  { key: '{servername}', desc: 'Server name' },
  { key: '{mapname}', desc: 'Current map name' },
  { key: '{players}', desc: 'Current player count' },
  { key: '{maxplayers}', desc: 'Max player count' },
  { key: '{address}', desc: 'Server address (ip:port)' },
  { key: '{rulename}', desc: 'Matched rule name' },
  { key: '{pattern}', desc: 'Matched map pattern' },
  { key: '{time}', desc: 'Notification time' },
  { key: '{mapimage}', desc: 'Map preview image URL' },
] as const;

export const DEFAULT_MESSAGE_TEMPLATE = '🎮 {servername} | Map: {mapname} | Players: {players}/{maxplayers}';

export const DEFAULT_ALERT_TITLE = '🎮 Server Map Alert';

const defaultNotifySettings: MonitorNotifySettings = {
  notifyDesktop: true,
  notifyDiscord: false,
  discordWebhookUrl: '',
  notifyServerChan: false,
  serverChanKey: '',
  notifyCustomWebhook: false,
  customWebhookUrl: '',
  customMessageTemplate: '',
  alertTitle: '',
};

export function loadNotifySettings(): MonitorNotifySettings {
  try {
    const stored = localStorage.getItem(MONITOR_NOTIFY_KEY);
    if (stored) {
      return { ...defaultNotifySettings, ...JSON.parse(stored) };
    }
  } catch { /* ignore */ }
  return { ...defaultNotifySettings };
}

export function saveNotifySettings(settings: MonitorNotifySettings): void {
  try {
    localStorage.setItem(MONITOR_NOTIFY_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ============== Map Image URL ==============

const DEFAULT_API_BASE_URL = 'https://servers.upkk.com';

/**
 * Build the map preview image URL for a given map name.
 * Uses the configured API base URL (from localStorage) or the default.
 */
export function getMapPreviewUrl(mapName: string): string {
  let baseUrl = DEFAULT_API_BASE_URL;
  try {
    const stored = localStorage.getItem('apiBaseUrl');
    if (stored) baseUrl = stored;
  } catch { /* ignore */ }
  if (!mapName) return `${baseUrl}/mapimage/default_1.webp`;
  return `${baseUrl}/mapimage/${encodeURIComponent(mapName)}.webp`;
}

// ============== Message Template ==============

/**
 * Format a notification message by replacing placeholders with actual values.
 * If template is empty, falls back to DEFAULT_MESSAGE_TEMPLATE.
 */
export function formatNotificationMessage(template: string, server: MatchedServer): string {
  const t = template || DEFAULT_MESSAGE_TEMPLATE;
  return t
    .replace(/\{servername\}/gi, server.serverName)
    .replace(/\{mapname\}/gi, server.mapName)
    .replace(/\{players\}/gi, String(server.players))
    .replace(/\{maxplayers\}/gi, String(server.maxPlayers))
    .replace(/\{address\}/gi, server.serverKey)
    .replace(/\{rulename\}/gi, server.matchedRule)
    .replace(/\{pattern\}/gi, server.matchedPattern)
    .replace(/\{time\}/gi, new Date().toLocaleString())
    .replace(/\{mapimage\}/gi, getMapPreviewUrl(server.mapName));
}

// ============== File-based Persistence (Tauri) ==============

/**
 * Persist monitor rules to a file in the app data directory via Tauri.
 * This ensures data survives app restarts even if WebView localStorage is cleared.
 * Fire-and-forget: errors are silently ignored (localStorage serves as fallback).
 */
function persistMonitorRulesToFile(rules: MonitorRule[]): void {
  (async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_monitor_data', { data: JSON.stringify(rules) });
    } catch { /* Tauri not available or save failed — localStorage is the fallback */ }
  })();
}

/**
 * Load monitor rules from the file in the app data directory.
 * Returns the rules array, or null if the file doesn't exist or Tauri is unavailable.
 */
export async function loadMonitorRulesFromFile(): Promise<MonitorRule[] | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const raw = await invoke<string>('load_monitor_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Handle both array format and wrapped format
      return Array.isArray(parsed) ? parsed : null;
    }
  } catch { /* Tauri not available or load failed */ }
  return null;
}

// ============== Rule Management ==============

export function loadMonitorRules(): MonitorRule[] {
  try {
    const stored = localStorage.getItem(MONITOR_RULES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch { /* ignore */ }
  return [];
}

export function saveMonitorRules(rules: MonitorRule[]): void {
  try {
    localStorage.setItem(MONITOR_RULES_KEY, JSON.stringify(rules));
  } catch { /* ignore */ }
  // Also persist to file for reliable storage across app restarts
  persistMonitorRulesToFile(rules);
}

export function getMonitorInterval(): number {
  try {
    const stored = localStorage.getItem(MONITOR_INTERVAL_KEY);
    if (stored) {
      const val = parseInt(stored, 10);
      if (val >= 30) return val;
    }
  } catch { /* ignore */ }
  return 30; // default 30 seconds
}

export function setMonitorInterval(seconds: number): void {
  try {
    localStorage.setItem(MONITOR_INTERVAL_KEY, String(Math.max(30, seconds)));
  } catch { /* ignore */ }
}

export function getMonitorEnabled(): boolean {
  try {
    return localStorage.getItem(MONITOR_ENABLED_KEY) === 'true';
  } catch { return false; }
}

export function setMonitorEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(MONITOR_ENABLED_KEY, String(enabled));
  } catch { /* ignore */ }
}

// ============== Pattern Matching ==============

/**
 * Match a map name against a pattern (supports * wildcard, case-insensitive)
 */
export function matchMapPattern(mapName: string, pattern: string): boolean {
  if (!mapName || !pattern) return false;
  const lowerMap = mapName.toLowerCase();
  const lowerPattern = pattern.toLowerCase().trim();
  
  if (lowerPattern === '*') return true;
  
  // Convert wildcard pattern to regex
  const escaped = lowerPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  try {
    const regex = new RegExp(regexStr);
    return regex.test(lowerMap);
  } catch {
    // Fallback to simple includes check
    return lowerMap.includes(lowerPattern.replace(/\*/g, ''));
  }
}

// ============== Notification Functions ==============

/**
 * Send desktop notification with in-app toast fallback.
 * Always shows an in-app toast. Also tries system notification (Tauri/Web API).
 */
export async function sendDesktopNotification(
  title: string,
  body: string
): Promise<boolean> {
  // Always show in-app toast notification (Telegram-style, bottom-right)
  showToast(title, body, 'info', 8000);

  // Also try system-level notification (best effort)
  try {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body });
      }
    } catch {
      // Tauri notification not available, try Web Notification API
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    }
  } catch (err) {
    console.error('[Monitor] System notification failed:', err);
  }
  return true;
}

/**
 * Send Discord webhook notification
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  server: MatchedServer,
  alertTitle?: string
): Promise<boolean> {
  if (!webhookUrl) return false;
  
  const title = alertTitle
    ? formatNotificationMessage(alertTitle, server)
    : DEFAULT_ALERT_TITLE;

  const mapImageUrl = getMapPreviewUrl(server.mapName);

  const embed = {
    title,
    color: 0x5865F2, // Discord blurple
    fields: [
      { name: '🖥️ Server', value: server.serverName, inline: true },
      { name: '🗺️ Map', value: server.mapName, inline: true },
      { name: '👥 Players', value: `${server.players}/${server.maxPlayers}`, inline: true },
      { name: '📍 Address', value: server.serverKey, inline: true },
      { name: '📋 Rule', value: server.matchedRule, inline: true },
      { name: '🔍 Pattern', value: server.matchedPattern, inline: true },
    ],
    image: { url: mapImageUrl },
    timestamp: new Date().toISOString(),
    footer: { text: 'XProj Server Monitor' },
  };

  try {
    // Try Tauri HTTP plugin first
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const response = await tauriFetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
      return response.ok || response.status === 204;
    } catch (tauriErr) {
      const errMsg = tauriErr instanceof Error ? tauriErr.message : String(tauriErr);
      const isModuleError = errMsg.includes('module') || errMsg.includes('import') || errMsg.includes('Cannot find') || errMsg.includes('Failed to resolve');
      if (!isModuleError) throw tauriErr;
    }

    // Fallback to regular fetch
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return response.ok || response.status === 204;
  } catch (err) {
    console.error('[Monitor] Discord webhook failed:', err);
    return false;
  }
}

/**
 * Send Server Chan (Server酱) notification
 * Server Chan pushes messages to WeChat via its API.
 * API docs: https://sct.ftqq.com/
 */
export async function sendServerChanNotification(
  sendKey: string,
  server: MatchedServer,
  alertTitle?: string
): Promise<boolean> {
  if (!sendKey) return false;

  // Validate sendKey format (alphanumeric and common token characters only)
  if (!/^[A-Za-z0-9]+$/.test(sendKey)) return false;

  const resolvedTitle = alertTitle
    ? formatNotificationMessage(alertTitle, server)
    : `🎮 ${server.serverName} - ${server.mapName}`;
  const despHeading = alertTitle
    ? formatNotificationMessage(alertTitle, server)
    : 'Server Map Alert';
  const desp = [
    `## ${despHeading}`,
    '',
    `| Info | Detail |`,
    `| --- | --- |`,
    `| 🖥️ Server | ${server.serverName} |`,
    `| 🗺️ Map | ${server.mapName} |`,
    `| 👥 Players | ${server.players}/${server.maxPlayers} |`,
    `| 📍 Address | ${server.serverKey} |`,
    `| 📋 Rule | ${server.matchedRule} |`,
    `| 🔍 Pattern | ${server.matchedPattern} |`,
    '',
    `> XProj Server Monitor — ${new Date().toLocaleString()}`,
  ].join('\n');

  const url = `https://sctapi.ftqq.com/${encodeURIComponent(sendKey)}.send`;

  try {
    // Try Tauri HTTP plugin first
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const response = await tauriFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: resolvedTitle, desp }),
      });
      return response.ok;
    } catch (tauriErr) {
      const errMsg = tauriErr instanceof Error ? tauriErr.message : String(tauriErr);
      const isModuleError = errMsg.includes('module') || errMsg.includes('import') || errMsg.includes('Cannot find') || errMsg.includes('Failed to resolve');
      if (!isModuleError) throw tauriErr;
    }

    // Fallback to regular fetch
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: resolvedTitle, desp }),
    });
    return response.ok;
  } catch (err) {
    console.error('[Monitor] Server Chan notification failed:', err);
    return false;
  }
}

/**
 * Send notification to a custom webhook URL via HTTP POST.
 * The webhook receives a JSON payload with all server match details.
 * This is intended for users with development capabilities who want to
 * integrate with custom bots or services (e.g., QQ group bots).
 *
 * POST JSON body fields:
 *  - event: "map_alert" (string, event type identifier)
 *  - server_name: server name (string)
 *  - map_name: current map name (string)
 *  - players: current player count (number)
 *  - max_players: max player slots (number)
 *  - address: server address "ip:port" (string)
 *  - rule_name: matched rule name (string)
 *  - matched_pattern: matched map pattern (string)
 *  - timestamp: ISO 8601 timestamp (string)
 *  - message: formatted message using custom template (string)
 *  - map_image_url: map preview image URL (string)
 */
export async function sendCustomWebhook(
  webhookUrl: string,
  server: MatchedServer,
  customMessage?: string
): Promise<boolean> {
  if (!webhookUrl) return false;

  const payload = {
    event: 'map_alert',
    server_name: server.serverName,
    map_name: server.mapName,
    players: server.players,
    max_players: server.maxPlayers,
    address: server.serverKey,
    rule_name: server.matchedRule,
    matched_pattern: server.matchedPattern,
    timestamp: new Date().toISOString(),
    message: customMessage || formatNotificationMessage('', server),
    map_image_url: getMapPreviewUrl(server.mapName),
  };

  try {
    // Try Tauri HTTP plugin first
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const response = await tauriFetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.ok || response.status === 204;
    } catch (tauriErr) {
      const errMsg = tauriErr instanceof Error ? tauriErr.message : String(tauriErr);
      const isModuleError = errMsg.includes('module') || errMsg.includes('import') || errMsg.includes('Cannot find') || errMsg.includes('Failed to resolve');
      if (!isModuleError) throw tauriErr;
    }

    // Fallback to regular fetch
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok || response.status === 204;
  } catch (err) {
    console.error('[Monitor] Custom webhook failed:', err);
    return false;
  }
}

// ============== Monitor Engine ==============

// Cooldown tracking: key = "ruleId:serverKey", value = last notification time
const cooldownMap = new Map<string, number>();

// Consecutive match tracking
// Stores the last matched map name per rule+server
const lastMatchedMapMap = new Map<string, string>();
// Stores the consecutive hit count per rule+server
const matchCounterMap = new Map<string, number>();

// Duplicate notification prevention:
// Tracks the last *notified* map per rule+server.
// If the map hasn't changed since last notification, skip.
// If it changed to something else and came back, allow notification again.
const lastNotifiedMapMap = new Map<string, string>();
// Tracks the previous map seen per rule+server (for detecting map changes between checks)
const previousSeenMapMap = new Map<string, string>();

function isCoolingDown(ruleId: string, serverKey: string, cooldownSeconds: number): boolean {
  const key = `${ruleId}:${serverKey}`;
  const lastTime = cooldownMap.get(key);
  if (!lastTime) return false;
  return (Date.now() - lastTime) < cooldownSeconds * 1000;
}

function setCooldown(ruleId: string, serverKey: string): void {
  cooldownMap.set(`${ruleId}:${serverKey}`, Date.now());
}

/**
 * Track consecutive matches for a server+map combination.
 * Returns the current consecutive count after incrementing.
 * Resets if the map changed from the previous check.
 */
function trackConsecutiveMatch(ruleId: string, serverKey: string, mapName: string): number {
  const key = `${ruleId}:${serverKey}`;
  const prevMap = lastMatchedMapMap.get(key);
  if (prevMap !== mapName) {
    // Different map or first time — reset counter
    lastMatchedMapMap.set(key, mapName);
    matchCounterMap.set(key, 1);
    return 1;
  }
  // Same map — increment
  const count = (matchCounterMap.get(key) || 0) + 1;
  matchCounterMap.set(key, count);
  return count;
}

/**
 * Reset consecutive match counter for a server (e.g. when map no longer matches)
 */
function resetConsecutiveMatch(ruleId: string, serverKey: string): void {
  const key = `${ruleId}:${serverKey}`;
  matchCounterMap.delete(key);
  lastMatchedMapMap.delete(key);
}

/**
 * Check if notification should be suppressed for duplicate map detection.
 * Returns true if the map is the same as the last notified map AND
 * no different map has been seen in between.
 */
function isDuplicateNotification(ruleId: string, serverKey: string, mapName: string): boolean {
  const key = `${ruleId}:${serverKey}`;
  const lastNotified = lastNotifiedMapMap.get(key);
  if (!lastNotified) return false;
  // If the last notified map is different, allow notification
  if (lastNotified !== mapName) return false;
  // Same map as last notified — check if a different map was seen in between
  const prevSeen = previousSeenMapMap.get(key);
  // If previous seen map is undefined or same as current, it means no different map appeared
  // So suppress this notification
  if (!prevSeen || prevSeen === mapName) return true;
  // A different map was seen between last notification and now, allow re-notification
  return false;
}

/**
 * Record that a notification was sent for this rule+server+map
 */
function setNotifiedMap(ruleId: string, serverKey: string, mapName: string): void {
  const key = `${ruleId}:${serverKey}`;
  lastNotifiedMapMap.set(key, mapName);
}

/**
 * Update the previously seen map for a rule+server (called every check cycle)
 */
function updatePreviousSeenMap(ruleId: string, serverKey: string, mapName: string): void {
  const key = `${ruleId}:${serverKey}`;
  previousSeenMapMap.set(key, mapName);
}

/**
 * Perform a single monitoring check cycle.
 * Uses local A2S queries for ALL monitored servers to get real-time data.
 * Uses global notification settings for all notification channels.
 * Returns:
 *  - matched: servers that triggered new notifications this cycle
 *  - currentMatches: ALL servers currently matching any rule pattern (regardless of cooldown/dedup)
 *  - autoJoined: the server that was auto-joined (if any) — only the first match triggers auto-join
 */
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

    // Query ALL selected servers via local A2S protocol
    const allServers: MonitorServerInfo[] = [];
    for (const addr of allSelectedKeys) {
      const parsed = parseServerAddress(addr);
      if (!parsed) continue;
      try {
        const result = await queryServerA2S(parsed.ip, parsed.port);
        if (result.success) {
          allServers.push({
            key: addr,
            name: result.name || addr,
            mapName: result.map_name || '',
            players: result.real_players ?? result.players ?? 0,
            maxPlayers: result.max_players ?? 0,
            isOnline: true,
            gameName: result.game || '',
          });
        } else {
          // Server offline or query failed
          allServers.push({
            key: addr,
            name: addr,
            mapName: '',
            players: 0,
            maxPlayers: 0,
            isOnline: false,
            gameName: '',
          });
        }
      } catch (queryErr) {
        console.error(`[Monitor] A2S query failed for ${addr}:`, queryErr);
        allServers.push({
          key: addr,
          name: addr,
          mapName: '',
          players: 0,
          maxPlayers: 0,
          isOnline: false,
          gameName: '',
        });
      }
    }

    if (allServers.length === 0) {
      return { matched: [], currentMatches: [], autoJoined: null, error: null };
    }

    const matched: MatchedServer[] = [];
    const currentMatches: MatchedServer[] = [];
    let autoJoined: MatchedServer | null = null;

    for (const rule of enabledRules) {
      const serversToCheck = allServers.filter(s => rule.selectedServers.includes(s.key));

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
        for (const pattern of rule.mapPatterns) {
          if (matchMapPattern(mapName, pattern)) {
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

            // Track consecutive matches — require N consecutive detections before notifying
            const consecutiveCount = trackConsecutiveMatch(rule.id, serverKey, mapName);
            const required = rule.requiredMatches ?? 1;
            if (consecutiveCount < required) continue;

            // Check cooldown
            if (isCoolingDown(rule.id, serverKey, rule.cooldownSeconds)) continue;

            // Check for duplicate notification:
            // Skip if the same map was already notified and no different map appeared in between
            if (isDuplicateNotification(rule.id, serverKey, mapName)) continue;

            matched.push(matchEntry);
            setCooldown(rule.id, serverKey);
            setNotifiedMap(rule.id, serverKey, mapName);

            // Send notifications using global settings (all async, errors won't interrupt monitoring)
            const customMsg = formatNotificationMessage(notifySettings.customMessageTemplate, matchEntry);
            const resolvedAlertTitle = notifySettings.alertTitle || undefined;

            if (notifySettings.notifyDesktop) {
              try {
                const desktopTitle = resolvedAlertTitle
                  ? formatNotificationMessage(resolvedAlertTitle, matchEntry)
                  : `🎮 ${serverName}`;
                await sendDesktopNotification(
                  desktopTitle,
                  customMsg
                );
              } catch (notifyErr) {
                console.error('[Monitor] Desktop notification failed:', notifyErr);
              }
            }

            if (notifySettings.notifyDiscord && notifySettings.discordWebhookUrl) {
              try {
                await sendDiscordWebhook(notifySettings.discordWebhookUrl, matchEntry, resolvedAlertTitle);
              } catch (notifyErr) {
                console.error('[Monitor] Discord notification failed:', notifyErr);
              }
            }

            if (notifySettings.notifyServerChan && notifySettings.serverChanKey) {
              try {
                await sendServerChanNotification(notifySettings.serverChanKey, matchEntry, resolvedAlertTitle);
              } catch (notifyErr) {
                console.error('[Monitor] ServerChan notification failed:', notifyErr);
              }
            }

            if (notifySettings.notifyCustomWebhook && notifySettings.customWebhookUrl) {
              try {
                await sendCustomWebhook(notifySettings.customWebhookUrl, matchEntry, customMsg);
              } catch (notifyErr) {
                console.error('[Monitor] Custom webhook notification failed:', notifyErr);
              }
            }

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

// ============== Rule ID Generation ==============

export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function createDefaultRule(): MonitorRule {
  return {
    id: generateRuleId(),
    name: '',
    enabled: true,
    serverMode: 'selected',
    selectedServers: [],
    mapPatterns: [],
    minPlayers: 0,
    notifyDesktop: true,
    notifyDiscord: false,
    discordWebhookUrl: '',
    notifyServerChan: false,
    serverChanKey: '',
    cooldownSeconds: 60, // 1 minute default
    requiredMatches: 1, // require 1 detection by default (immediate)
    autoJoin: false,
    createdAt: new Date().toISOString(),
  };
}
