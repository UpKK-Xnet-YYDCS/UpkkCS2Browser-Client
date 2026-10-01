import assert from 'node:assert/strict';
import test from 'node:test';
import type { AIChatEvent } from './aiChat.ts';
import type { DesktopChatMessage } from './aiChatSessions.ts';
import {
  OUTPUT_TOKEN_ACCUMULATOR_LIMIT,
  applyAIChatAssistantEvent,
  getOutputTokenAccumulatorCount,
  updateAIChatMessage,
} from './aiChatPresentation.ts';
import { estimateAIChatOutputTokens } from '../utils/aiTokens.ts';

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

test('output token counters stay bounded for answers that stop or fail before completing', () => {
  for (let index = 0; index < OUTPUT_TOKEN_ACCUMULATOR_LIMIT * 4; index += 1) {
    const message: DesktopChatMessage = { id: `stopped-${index}`, role: 'assistant', content: '', pending: true };
    applyAIChatAssistantEvent(message, { type: 'message', content: 'partial answer' });
  }
  assert.equal(getOutputTokenAccumulatorCount(), OUTPUT_TOKEN_ACCUMULATOR_LIMIT);
});

test('an evicted streaming counter recounts to the same token total', () => {
  let message: DesktopChatMessage = { id: 'long-stream', role: 'assistant', content: '', pending: true };
  const chunks = ['思考', ' step one', ' 中文 mixed', ' \uD83D', '\uDE00 emoji', ' tail'];
  message = applyAIChatAssistantEvent(message, { type: 'thinking', content: 'plan 计划' });
  chunks.forEach((chunk, index) => {
    if (index === 3) {
      for (let other = 0; other < OUTPUT_TOKEN_ACCUMULATOR_LIMIT + 1; other += 1) {
        applyAIChatAssistantEvent(
          { id: `evict-${other}`, role: 'assistant', content: '', pending: true },
          { type: 'message', content: 'x' },
        );
      }
    }
    message = applyAIChatAssistantEvent(message, { type: 'message', content: chunk });
    assert.equal(message.tokenOutput, estimateAIChatOutputTokens(message.content, message.thinking));
  });
  const completed = applyAIChatAssistantEvent(message, { type: 'complete' });
  assert.equal(completed.tokenOutput, message.tokenOutput);
});
