const DEFAULT_PREFETCH_DELAY_MS = 150;
const PREFETCH_DELAY_KEY = 'prefetchDelay';
const PREFETCH_PAGES_KEY = 'prefetchPages';
const DEFAULT_PREFETCH_PAGES = 5;

let prefetchVersion = 0;

export function getPrefetchDelay(): number {
  try {
    const saved = localStorage.getItem(PREFETCH_DELAY_KEY);
    if (saved !== null) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= 0) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFETCH_DELAY_MS;
}

export function setPrefetchDelay(ms: number): void {
  localStorage.setItem(PREFETCH_DELAY_KEY, String(Math.max(0, Math.floor(ms))));
}

export function getPrefetchPages(): number {
  try {
    const saved = localStorage.getItem(PREFETCH_PAGES_KEY);
    if (saved !== null) {
      const n = parseInt(saved, 10);
      return isNaN(n) || n < 0 ? DEFAULT_PREFETCH_PAGES : n;
    }
  } catch { /* ignore */ }
  return DEFAULT_PREFETCH_PAGES;
}

export function setPrefetchPages(n: number): void {
  localStorage.setItem(PREFETCH_PAGES_KEY, String(Math.max(0, Math.floor(n))));
}

export function cancelPrefetch(): void {
  prefetchVersion++;
}

export function startPrefetchSequence(): number {
  return ++prefetchVersion;
}

export function isPrefetchSequenceCurrent(version: number): boolean {
  return prefetchVersion === version;
}
