import assert from 'node:assert/strict';
import test from 'node:test';
import type { AIChatEvent } from './aiChat.ts';
import type { DesktopChatMessage } from './aiChatSessions.ts';
import { applyAIChatAssistantEvent, updateAIChatMessage } from './aiChatPresentation.ts';

test('200 streaming chunks preserve all 15-turn historical message references', () => {
  let messages: DesktopChatMessage[] = [];
  for (let turn = 0; turn < 15; turn += 1) {
    messages.push({ id: `user-${turn}`, role: 'user', content: `question ${turn}` });
    messages.push({
      id: `assistant-${turn}`,
      role: 'assistant',
      content: turn === 14 ? '' : `answer ${turn}`,
      pending: turn === 14,
    });
  }
  const activeId = 'assistant-14';
  const historical = messages.slice(0, -1);
  const activeBeforeStreaming = messages.at(-1);

  for (let chunk = 0; chunk < 200; chunk += 1) {
    const event: AIChatEvent = { type: 'message', content: 'x' };
    messages = updateAIChatMessage(messages, activeId, message => (
      applyAIChatAssistantEvent(message, event)
    ));
    historical.forEach((message, index) => assert.equal(messages[index], message));
  }

  assert.equal(messages.at(-1)?.content.length, 200);
  assert.notEqual(messages.at(-1), activeBeforeStreaming);
});

test('message update returns the same array when the target is absent', () => {
  const messages: DesktopChatMessage[] = [{ id: 'one', role: 'user', content: 'hello' }];
  assert.equal(updateAIChatMessage(messages, 'missing', message => message), messages);
});
