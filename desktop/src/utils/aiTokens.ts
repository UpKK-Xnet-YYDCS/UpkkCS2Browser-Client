/** Approximate token counts for live UI metering (not billing-accurate). */
export function estimateAITokens(text: string): number {
  if (!text) return 0;
  let cjk = 0;
  let other = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x3040 && code <= 0x30ff)
      || (code >= 0x3400 && code <= 0x4dbf)
      || (code >= 0x4e00 && code <= 0x9fff)
      || (code >= 0xf900 && code <= 0xfaff)
      || (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjk += 1;
    } else if (!/\s/u.test(char)) {
      other += 1;
    }
  }
  const tokens = cjk + Math.ceil(other / 4);
  return text.trim() ? Math.max(1, tokens) : 0;
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

function trimCompactUnit(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}
