/** Approximate token counts for live UI metering (not billing-accurate). */
export function estimateAITokens(text: string): number {
  return tokensFromCounts(countAITokenUnits(text));
}

export interface AITokenAccumulator {
  append(fragment: string): number;
  value(): number;
}

export function createAITokenAccumulator(initial = ''): AITokenAccumulator {
  const counts = { cjk: 0, other: 0, pending: '' };
  ingestTokenFragment(counts, initial);
  return {
    append(fragment: string) {
      ingestTokenFragment(counts, fragment);
      return tokensFromCounts(counts);
    },
    value() {
      return tokensFromCounts(counts);
    },
  };
}

export function estimateAIChatInputTokens(parts: Array<string | undefined | null>): number {
  return estimateAITokens(parts.filter(Boolean).join('\n'));
}

export function estimateAIChatOutputTokens(content: string, thinking = ''): number {
  return estimateAITokens(thinking + content);
}

/** Compact display: 999, 1.2k, 1.5M */
export function formatCompactTokenCount(value: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const compact = trimCompactUnit(n / 1000);
    // Avoid 1000k when 999,950+ rounds up.
    return compact === '1000' ? '1M' : compact + 'k';
  }
  return trimCompactUnit(n / 1_000_000) + 'M';
}

interface TokenCounts {
  cjk: number;
  other: number;
  pending: string;
}

function countAITokenUnits(text: string): TokenCounts {
  const counts: TokenCounts = { cjk: 0, other: 0, pending: '' };
  ingestTokenFragment(counts, text);
  return counts;
}

function ingestTokenFragment(counts: TokenCounts, fragment: string): void {
  if (!fragment) return;
  const combined = counts.pending + fragment;
  counts.pending = '';
  let text = combined;
  if (text.length > 0 && isHighSurrogate(text.charCodeAt(text.length - 1))) {
    counts.pending = text.slice(-1);
    text = text.slice(0, -1);
  }
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (isCjkCodePoint(code)) counts.cjk += 1;
    else if (!/\s/u.test(char)) counts.other += 1;
  }
}

function tokensFromCounts(counts: TokenCounts): number {
  const units = counts.cjk + counts.other;
  if (units <= 0) return 0;
  return Math.max(1, counts.cjk + Math.ceil(counts.other / 4));
}

function isCjkCodePoint(code: number): boolean {
  return (
    (code >= 0x3040 && code <= 0x30ff)
    || (code >= 0x3400 && code <= 0x4dbf)
    || (code >= 0x4e00 && code <= 0x9fff)
    || (code >= 0xf900 && code <= 0xfaff)
    || (code >= 0xac00 && code <= 0xd7af)
  );
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function trimCompactUnit(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}
