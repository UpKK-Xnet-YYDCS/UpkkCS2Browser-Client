import assert from 'node:assert/strict';
import test from 'node:test';
import type { AIChatEvent } from './aiChat.ts';
import { applyAIChatAssistantEvent, updateAIChatMessage } from './aiChatPresentation.ts';
import { createAIChatStreamCoalescer } from './aiChatStream.ts';
import type { DesktopChatMessage } from './aiChatSessions.ts';

test('coalesces consecutive text events onto one flush and keeps control-event order', () => {
  const flushed: AIChatEvent[][] = [];
  let frame: (() => void) | undefined;
  let timeout: (() => void) | undefined;
  const coalescer = createAIChatStreamCoalescer({
    onFlush(events) {
      flushed.push(events);
    },
    scheduleFrame(callback) {
      frame = callback;
      return 1;
    },
    cancelFrame() {
      frame = undefined;
    },
    scheduleTimeout(callback) {
      timeout = callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    cancelTimeout() {
      timeout = undefined;
    },
  });

  coalescer.push({ type: 'thinking', content: 'a' });
  coalescer.push({ type: 'thinking', content: 'b' });
  coalescer.push({ type: 'message', content: 'x' });
  coalescer.push({ type: 'message', content: 'y' });
  assert.equal(flushed.length, 0);
  frame?.();
  assert.deepEqual(flushed, [[{ type: 'thinking', content: 'ab' }, { type: 'message', content: 'xy' }]]);

  coalescer.push({ type: 'message', content: 'z' });
  coalescer.push({ type: 'complete' });
  assert.deepEqual(flushed.at(-1), [{ type: 'message', content: 'z' }, { type: 'complete' }]);
  assert.equal(timeout, undefined);
});

test('hidden-window timeout flushes when rAF never runs', () => {
  const flushed: AIChatEvent[][] = [];
  let timeout: (() => void) | undefined;
  const coalescer = createAIChatStreamCoalescer({
    onFlush(events) {
      flushed.push(events);
    },
    scheduleFrame() {
      return 1;
    },
    cancelFrame() {
      return undefined;
    },
    scheduleTimeout(callback) {
      timeout = callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    cancelTimeout() {
      timeout = undefined;
    },
  });

  coalescer.push({ type: 'message', content: 'hi' });
  timeout?.();
  assert.deepEqual(flushed, [[{ type: 'message', content: 'hi' }]]);
});

test('reset flushes pending text first so later complete sees the reset body', () => {
  const message: DesktopChatMessage = {
    id: 'assistant',
    role: 'assistant',
    content: 'old',
    thinking: 'why',
    pending: true,
  };
  let current = [message];
  const coalescer = createAIChatStreamCoalescer({
    onFlush(events) {
      for (const event of events) {
        current = updateAIChatMessage(current, 'assistant', item => applyAIChatAssistantEvent(item, event));
      }
    },
    scheduleFrame(callback) {
      callback();
      return 1;
    },
    cancelFrame() {
      return undefined;
    },
    scheduleTimeout() {
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    cancelTimeout() {
      return undefined;
    },
  });

  coalescer.push({ type: 'message', content: 'pending' });
  coalescer.push({ type: 'reset' });
  coalescer.push({ type: 'message', content: 'new' });
  coalescer.flush();
  assert.equal(current[0].content, 'new');
  assert.equal(current[0].thinking, '');
});
