import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIChatRequestError,
  consumeAIChatSSE,
  parseSSEText,
  streamAIChat,
  type AIChatEvent,
  type AIChatFetch,
} from './aiChat.ts';

const encoder = new TextEncoder();

function sseResponse(parts: string[]): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

test('parses SSE events split across arbitrary chunks', () => {
  const first = parseSSEText('data: {"type":"mess');
  assert.equal(first.events.length, 0);
  const second = parseSSEText(`${first.rest}age","content":"hi"}\n\ndata: {"type":"complete"}\n\n`);
  assert.deepEqual(second.events.map((event) => event.type), ['message', 'complete']);
  assert.equal(second.events[0]?.content, 'hi');
});

test('rejects an unfinished stream', async () => {
  const stream = sseResponse(['data: {"type":"message","content":"partial"}\n\n']).body!;
  await assert.rejects(
    consumeAIChatSSE(stream, () => undefined, new AbortController().signal, 100),
    /ended before completion/,
  );
});

test('sends language as a header without adding it to the strict request body', async () => {
  let capturedBody: Record<string, unknown> | undefined;
  let capturedHeaders: Headers | undefined;
  const fetcher: AIChatFetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init.body)) as Record<string, unknown>;
    capturedHeaders = new Headers(init.headers);
    return sseResponse(['data: {"type":"complete"}\n\n']);
  };

  await streamAIChat(
    {
      message: 'aaa',
      history: [{ role: 'user', content: 'previous' }],
      instructions: 'be brief',
      context: 'local context',
      language: 'zh-CN',
    },
    {
      signal: new AbortController().signal,
      onEvent: () => undefined,
      fetcher,
      baseUrl: 'https://example.test',
      token: 'token',
    },
  );

  assert.deepEqual(capturedBody, {
    message: 'aaa',
    history: [{ role: 'user', content: 'previous' }],
    instructions: 'be brief',
    context: 'local context',
  });
  assert.equal(capturedHeaders?.get('Accept-Language'), 'zh-CN');
});

test('preserves a terminal SSE validation error instead of reporting an incomplete stream', async () => {
  let calls = 0;
  const fetcher: AIChatFetch = async () => {
    calls += 1;
    return sseResponse(['data: {"type":"error","error":"Invalid request body"}\n\n']);
  };

  await assert.rejects(
    streamAIChat(
      { message: 'aaa', history: [], language: 'en' },
      {
        signal: new AbortController().signal,
        onEvent: () => undefined,
        fetcher,
        baseUrl: 'https://example.test',
        token: 'token',
        retryWait: async () => undefined,
      },
    ),
    (error: unknown) => error instanceof AIChatRequestError &&
      error.message === 'Invalid request body' && !error.retryable,
  );
  assert.equal(calls, 1);
});

test('retries with continue_from and preserves streamed content', async () => {
  const bodies: Array<Record<string, unknown>> = [];
  let call = 0;
  const fetcher: AIChatFetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
    call += 1;
    return call === 1
      ? sseResponse(['data: {"type":"message","content":"Hello "}\n\n'])
      : sseResponse(['data: {"type":"message","content":"world"}\n\ndata: {"type":"complete"}\n\n']);
  };
  const events: AIChatEvent[] = [];

  const content = await streamAIChat(
    { message: 'test', history: [], language: 'en' },
    {
      signal: new AbortController().signal,
      onEvent: (event) => events.push(event),
      fetcher,
      baseUrl: 'https://example.test',
      token: 'token',
      retryWait: async () => undefined,
    },
  );

  assert.equal(content, 'Hello world');
  assert.equal(bodies[1]?.continue_from, 'Hello ');
  assert.equal(events.some((event) => event.type === 'retry'), true);
});

test('cancels an active stream without retrying', async () => {
  const abort = new AbortController();
  let calls = 0;
  const fetcher: AIChatFetch = async () => {
    calls += 1;
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"queue","position":1}\n\n'));
      },
    }), { status: 200 });
  };

  await assert.rejects(
    streamAIChat(
      { message: 'cancel', history: [], language: 'en' },
      {
        signal: abort.signal,
        fetcher,
        baseUrl: 'https://example.test',
        token: 'token',
        onEvent: () => abort.abort(),
        stallTimeoutMs: 1_000,
        retryWait: async () => undefined,
      },
    ),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
  assert.equal(calls, 1);
});
