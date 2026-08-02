import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_CHAT_MAX_TURNS,
  countAIChatTurns,
  createAIChatSession,
  deriveAIChatSessionTitle,
  ensureWritableAIChatSession,
  isAIChatSessionFull,
  loadAIChatSessionState,
  renameAIChatSessionFromMessage,
  saveAIChatSessionState,
  type AIChatSessionStorage,
  type DesktopChatMessage,
} from './aiChatSessions.ts';

test('derives compact session titles from the first user prompt', () => {
  assert.equal(deriveAIChatSessionTitle('  Find   active KZ servers  ', 'New chat'), 'Find active KZ servers');
  assert.equal(deriveAIChatSessionTitle('abcdefghijklmnopqrstuvwxyz', 'New chat', 8), 'abcdefgh...');
});

test('counts user and assistant pairs as one conversation turn', () => {
  const messages: DesktopChatMessage[] = [{ id: 'welcome', role: 'assistant', content: '' }];
  for (let index = 0; index < AI_CHAT_MAX_TURNS; index += 1) {
    messages.push({ id: `u-${index}`, role: 'user', content: 'question' });
    messages.push({ id: `a-${index}`, role: 'assistant', content: 'answer' });
  }
  assert.equal(countAIChatTurns(messages), 15);
  assert.equal(isAIChatSessionFull(messages), true);
});

test('starts a new session only before sending turn sixteen', () => {
  const session = createAIChatSession('New chat', { id: 'full', now: 1 });
  for (let index = 0; index < AI_CHAT_MAX_TURNS; index += 1) {
    session.messages.push({ id: `u-${index}`, role: 'user', content: 'question' });
    session.messages.push({ id: `a-${index}`, role: 'assistant', content: 'answer' });
  }
  const state = { sessions: [session], activeSessionId: session.id };
  const writable = ensureWritableAIChatSession(state, 'New chat', { id: 'next', now: 2 });
  assert.equal(writable.rolledOver, true);
  assert.equal(writable.session.id, 'next');
  assert.equal(writable.state.activeSessionId, 'next');
  assert.equal(writable.state.sessions[1].id, 'full');
});

test('renames only an unused session', () => {
  const empty = createAIChatSession('New chat', { id: 'empty', now: 1 });
  const renamed = renameAIChatSessionFromMessage([empty], empty.id, 'Find surf servers', 'New chat');
  assert.equal(renamed[0].title, 'Find surf servers');
  const used = { ...renamed[0], messages: [...renamed[0].messages, { id: 'u', role: 'user' as const, content: 'used' }] };
  assert.equal(renameAIChatSessionFromMessage([used], used.id, 'Replace me', 'New chat')[0].title, 'Find surf servers');
});

test('persists sessions and drops incomplete streamed messages', () => {
  const values = new Map<string, string>();
  const storage: AIChatSessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  const session = createAIChatSession('New chat', { id: 'one', now: 10 });
  session.messages.push({ id: 'u', role: 'user', content: 'hello' });
  session.messages.push({ id: 'pending', role: 'assistant', content: '', pending: true });
  saveAIChatSessionState(storage, { sessions: [session], activeSessionId: session.id });
  const restored = loadAIChatSessionState(storage, 'New chat');
  assert.equal(restored.activeSessionId, 'one');
  assert.deepEqual(restored.sessions[0].messages.map(message => message.id), ['welcome', 'u']);
});
