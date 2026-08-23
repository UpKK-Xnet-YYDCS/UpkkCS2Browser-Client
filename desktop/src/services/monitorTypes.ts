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

// ============== Storage Keys ==============

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

