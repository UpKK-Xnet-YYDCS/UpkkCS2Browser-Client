import type { AIChatEvent, RecommendedServer } from './aiChat.ts';
import type { LocalLatencyResult } from './desktopTools.ts';
import type { ServerStatus } from '../types/index.ts';
import type { DesktopChatMessage } from './aiChatSessions.ts';
import { estimateAIChatInputTokens } from '../utils/aiTokens.ts';

export interface AIChatStatusLabels {
  queue: string;
  retrieving: string;
  processing: string;
  thinking: string;
  retrying: string;
  grounding: string;
  action: string;
  failed: string;
}

function toStatus(server: RecommendedServer, latencyMs?: number): ServerStatus {
  return {
    ip: server.ip,
    port: server.port,
    name: server.name,
    map_name: server.map,
    players: server.players,
    max_players: server.maxPlayers,
    real_players: server.players,
    category: server.category,
    country_code: server.countryCode,
    online: true,
    is_online: true,
    local_latency_status: latencyMs === undefined ? undefined : 'success',
    local_latency_ms: latencyMs,
  } as ServerStatus;
}

export function collectJoinableServers(
  servers: readonly RecommendedServer[],
  localToolResults: readonly LocalLatencyResult[],
): ServerStatus[] {
  const byAddress = new Map<string, ServerStatus>();
  for (const server of servers) {
    byAddress.set((server.ip + ':' + server.port).toLowerCase(), toStatus(server));
  }
  for (const result of localToolResults) {
    byAddress.set(
      (result.server.ip + ':' + result.server.port).toLowerCase(),
      toStatus(result.server, result.latencyMs),
    );
  }
  return Array.from(byAddress.values());
}

function formatRetry(template: string, attempt: number, max: number): string {
  return template.replace('%d', String(attempt)).replace('%d', String(max));
}

export function statusForAIChatEvent(
  event: AIChatEvent,
  labels: AIChatStatusLabels,
): { text: string | null; requireLogin?: boolean } | null {
  switch (event.type) {
    case 'queue':
      return { text: labels.queue + (typeof event.position === 'number' ? ' #' + event.position : '') };
    case 'retrieving':
      return { text: labels.retrieving };
    case 'processing':
    case 'http_status':
      return { text: labels.processing };
    case 'thinking':
      return { text: labels.thinking };
    case 'message':
    case 'complete':
      return { text: null };
    case 'retry':
      return { text: formatRetry(labels.retrying, Number(event.attempt || 1), Number(event.max || 5)) };
    case 'grounding':
      return { text: labels.grounding };
    case 'action':
      return { text: labels.action + (event.status ? ': ' + String(event.status) : '') };
    case 'error':
      return { text: event.error || labels.failed, requireLogin: Boolean(event.require_login) };
    case 'timeout':
      return { text: event.error || labels.failed };
    case 'reset':
      return { text: labels.processing };
    default:
      return null;
  }
}

export function selectAIChatRequestHistory(
  messages: readonly DesktopChatMessage[],
): Array<{ role: DesktopChatMessage['role']; content: string }> {
  return messages
    .filter(item => item.id !== 'welcome' && !item.pending && item.content.trim())
    .slice(-10)
    .map(({ role, content }) => ({ role, content }));
}

export function createAIChatTurnMessages(
  timestamp: number,
  message: string,
  instructions: string,
  history: readonly { content: string }[],
): { userMessage: DesktopChatMessage; assistantPlaceholder: DesktopChatMessage } {
  return {
    userMessage: { id: 'user-' + timestamp, role: 'user', content: message },
    assistantPlaceholder: {
      id: 'assistant-' + timestamp,
      role: 'assistant',
      content: '',
      pending: true,
      thinkingOpen: true,
      tokenInput: estimateAIChatInputTokens([
        message,
        instructions.trim(),
        ...history.map(item => item.content),
      ]),
      tokenOutput: 0,
    },
  };
}
