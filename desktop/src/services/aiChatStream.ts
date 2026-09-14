import type { AIChatEvent } from './aiChat.ts';

const TEXT_EVENT_TYPES = new Set(['message', 'thinking']);

export interface AIChatStreamCoalescer {
  push(event: AIChatEvent): void;
  flush(): void;
  dispose(): void;
}

export interface AIChatStreamCoalescerOptions {
  onFlush(events: AIChatEvent[]): void;
  scheduleFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
  scheduleTimeout?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelTimeout?: (handle: ReturnType<typeof setTimeout>) => void;
  fallbackMs?: number;
}

function isTextEvent(event: AIChatEvent): boolean {
  return TEXT_EVENT_TYPES.has(event.type);
}

function mergeAdjacentText(events: AIChatEvent[]): AIChatEvent[] {
  const merged: AIChatEvent[] = [];
  for (const event of events) {
    const last = merged.at(-1);
    if (last && isTextEvent(last) && last.type === event.type) {
      last.content = String(last.content ?? '') + String(event.content ?? '');
      continue;
    }
    merged.push(isTextEvent(event) ? { type: event.type, content: String(event.content ?? '') } : event);
  }
  return merged;
}

export function createAIChatStreamCoalescer(options: AIChatStreamCoalescerOptions): AIChatStreamCoalescer {
  const fallbackMs = Math.max(16, options.fallbackMs ?? 32);
  const scheduleFrame = options.scheduleFrame ?? (callback => globalThis.requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? (handle => globalThis.cancelAnimationFrame(handle));
  const scheduleTimeout = options.scheduleTimeout ?? ((callback, ms) => globalThis.setTimeout(callback, ms));
  const cancelTimeout = options.cancelTimeout ?? (handle => globalThis.clearTimeout(handle));

  let buffer: AIChatEvent[] = [];
  let frameHandle: number | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function clearSchedule(): void {
    if (frameHandle !== null) {
      cancelFrame(frameHandle);
      frameHandle = null;
    }
    if (timeoutHandle !== null) {
      cancelTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  }

  function flush(): void {
    if (disposed) return;
    clearSchedule();
    if (buffer.length === 0) return;
    const events = mergeAdjacentText(buffer);
    buffer = [];
    options.onFlush(events);
  }

  function schedule(): void {
    if (frameHandle !== null || timeoutHandle !== null) return;
    frameHandle = scheduleFrame(() => {
      frameHandle = null;
      if (timeoutHandle !== null) {
        cancelTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      flush();
    });
    timeoutHandle = scheduleTimeout(() => {
      timeoutHandle = null;
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
      flush();
    }, fallbackMs);
  }

  return {
    push(event: AIChatEvent) {
      if (disposed) return;
      if (isTextEvent(event)) {
        buffer.push({ type: event.type, content: String(event.content ?? '') });
        schedule();
        return;
      }
      buffer.push(event);
      flush();
    },
    flush,
    dispose() {
      flush();
      disposed = true;
      clearSchedule();
    },
  };
}
