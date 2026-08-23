import type { MonitorNotifySettings, MonitorRule } from './monitorTypes';
import { invokeDesktop } from './desktopRuntime';

export const MONITOR_RULES_KEY = 'xproj_monitor_rules';
const MONITOR_INTERVAL_KEY = 'xproj_monitor_interval';
const MONITOR_ENABLED_KEY = 'xproj_monitor_enabled';
const MONITOR_NOTIFY_KEY = 'xproj_monitor_notify';

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

function persistMonitorRulesToFile(rules: MonitorRule[]): void {
  (async () => {
    try {
      await invokeDesktop('save_monitor_data', { data: JSON.stringify(rules) });
    } catch { /* Tauri not available or save failed — localStorage is the fallback */ }
  })();
}

/**
 * Load monitor rules from the file in the app data directory.
 * Returns the rules array, or null if the file doesn't exist or Tauri is unavailable.
 */
export async function loadMonitorRulesFromFile(): Promise<MonitorRule[] | null> {
  try {
    const raw = await invokeDesktop('load_monitor_data');
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
