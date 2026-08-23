import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectJoinableServers,
  createAIChatTurnMessages,
  selectAIChatRequestHistory,
  statusForAIChatEvent,
} from './aiChatWorkspace.ts';
import type { RecommendedServer } from './aiChat.ts';
import type { LocalLatencyResult } from './desktopTools.ts';
import type { DesktopChatMessage } from './aiChatSessions.ts';
import { estimateAIChatInputTokens } from '../utils/aiTokens.ts';

const labels = {
  queue: 'Queued',
  retrieving: 'Searching',
  processing: 'Preparing',
  thinking: 'Thinking',
  retrying: 'Reconnecting %d/%d',
  grounding: 'Ready',
  action: 'Action',
  failed: 'Failed',
};

function server(ip: string, port: string, name: string): RecommendedServer {
  return { ip, port, name, map: 'map', players: 1, maxPlayers: 10, category: 'ze', countryCode: 'CN' };
}

test('collectJoinableServers de-duplicates by address and lets local results win', () => {
  const first = server('1.1.1.1', '27015', 'A');
  const second = server('2.2.2.2', '27015', 'B');
  const local: LocalLatencyResult = {
    server: { ...first, name: 'A-local' },
    success: true,
    latencyMs: 12,
  };
  const joined = collectJoinableServers([first, second], [local]);
  assert.equal(joined.length, 2);
  assert.equal(joined[0].name, 'A-local');
  assert.equal(joined[0].local_latency_ms, 12);
  assert.equal(joined[1].name, 'B');
});

test('statusForAIChatEvent covers queue, retry, clear, and login-required errors', () => {
  assert.deepEqual(statusForAIChatEvent({ type: 'queue', position: 3 }, labels), { text: 'Queued #3' });
  assert.deepEqual(statusForAIChatEvent({ type: 'retry', attempt: 2, max: 5 }, labels), { text: 'Reconnecting 2/5' });
  assert.deepEqual(statusForAIChatEvent({ type: 'message' }, labels), { text: null });
  assert.deepEqual(statusForAIChatEvent({ type: 'complete' }, labels), { text: null });
  assert.deepEqual(
    statusForAIChatEvent({ type: 'error', error: 'nope', require_login: true }, labels),
    { text: 'nope', requireLogin: true },
  );
  assert.equal(statusForAIChatEvent({ type: 'unknown' }, labels), null);
});

function message(partial: Partial<DesktopChatMessage> & Pick<DesktopChatMessage, 'id' | 'role' | 'content'>): DesktopChatMessage {
  return partial;
}

test('selectAIChatRequestHistory drops welcome/pending/blank and keeps the last 10', () => {
  const messages: DesktopChatMessage[] = [
    message({ id: 'welcome', role: 'assistant', content: 'hi' }),
    message({ id: 'u0', role: 'user', content: '   ' }),
    message({ id: 'a0', role: 'assistant', content: 'thinking', pending: true }),
    ...Array.from({ length: 12 }, (_, index) => message({
      id: 'keep-' + index,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: 'msg-' + index,
    })),
  ];
  assert.deepEqual(
    selectAIChatRequestHistory(messages),
    Array.from({ length: 10 }, (_, index) => ({
      role: (index + 2) % 2 === 0 ? 'user' : 'assistant',
      content: 'msg-' + (index + 2),
    })),
  );
});

test('createAIChatTurnMessages builds ids and input tokens from message/instructions/history', () => {
  const history = [{ content: 'older' }, { content: 'newer' }];
  const turn = createAIChatTurnMessages(1700000000000, 'hello', '  be brief  ', history);
  assert.deepEqual(turn.userMessage, {
    id: 'user-1700000000000',
    role: 'user',
    content: 'hello',
  });
  assert.equal(turn.assistantPlaceholder.id, 'assistant-1700000000000');
  assert.equal(turn.assistantPlaceholder.role, 'assistant');
  assert.equal(turn.assistantPlaceholder.content, '');
  assert.equal(turn.assistantPlaceholder.pending, true);
  assert.equal(turn.assistantPlaceholder.thinkingOpen, true);
  assert.equal(turn.assistantPlaceholder.tokenOutput, 0);
  assert.equal(
    turn.assistantPlaceholder.tokenInput,
    estimateAIChatInputTokens(['hello', 'be brief', 'older', 'newer']),
  );
});
