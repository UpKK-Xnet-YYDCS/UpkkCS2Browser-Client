import {
  AI_STALL_TIMEOUT_MS,
  AIChatRequestError,
  abortError,
  throwIfAborted,
  type AIChatEvent,
} from './aiChatTypes.ts';

export function parseSSEText(buffer: string, flush = false): { events: AIChatEvent[]; rest: string } {
  const chunks = buffer.split(/\r?\n\r?\n/);
  let rest = chunks.pop() ?? '';
  if (flush && rest.trim()) {
    chunks.push(rest);
    rest = '';
  }

  const events: AIChatEvent[] = [];
  for (const chunk of chunks) {
    const data = chunk.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    events.push(JSON.parse(data) as AIChatEvent);
  }
  return { events, rest };
}

export async function consumeAIChatSSE(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AIChatEvent) => void,
  signal: AbortSignal,
  stallTimeoutMs = AI_STALL_TIMEOUT_MS,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  try {
    for (;;) {
      const result = await readWithTimeout(reader, signal, stallTimeoutMs);
      buffer += decoder.decode(result.value, { stream: !result.done });
      const parsed = parseSSEText(buffer, result.done);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        if (event.type === 'complete') completed = true;
        onEvent(event);
      }
      if (result.done) break;
    }
    if (!completed) throw new AIChatRequestError('AI stream ended before completion', true);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}


async function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  throwIfAborted(signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AIChatRequestError('AI stream stalled before completion', true)), timeoutMs);
        abortHandler = () => reject(abortError());
        signal.addEventListener('abort', abortHandler, { once: true });
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (abortHandler) signal.removeEventListener('abort', abortHandler);
  }
}
