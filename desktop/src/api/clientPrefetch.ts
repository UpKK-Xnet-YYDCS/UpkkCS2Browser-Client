const DEFAULT_PREFETCH_DELAY_MS = 150;
const PREFETCH_DELAY_KEY = 'prefetchDelay';
const PREFETCH_PAGES_KEY = 'prefetchPages';
const DEFAULT_PREFETCH_PAGES = 5;

let prefetchVersion = 0;
let prefetchAbort: AbortController | null = null;

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

function abortPrefetchController(): void {
  prefetchAbort?.abort();
  prefetchAbort = null;
}

export function cancelPrefetch(): void {
  prefetchVersion++;
  abortPrefetchController();
}

export function startPrefetchSequence(): { version: number; signal: AbortSignal } {
  prefetchVersion++;
  abortPrefetchController();
  prefetchAbort = new AbortController();
  return { version: prefetchVersion, signal: prefetchAbort.signal };
}

export function isPrefetchSequenceCurrent(version: number): boolean {
  return prefetchVersion === version;
}

export function collectPrefetchPageNumbers(currentPage: number, totalPages: number, count: number): number[] {
  if (count <= 0) return [];
  const pages: number[] = [];
  for (let i = 1; i <= count && currentPage + i <= totalPages; i++) {
    pages.push(currentPage + i);
  }
  return pages;
}
