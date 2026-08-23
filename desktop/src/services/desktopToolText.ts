export function normalizePunctuation(value: string): string {
  return value.replaceAll('：', ':').replaceAll('．', '.');
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function hasAny(value: string, terms: string[]): boolean {
  return terms.some(term => value.includes(term));
}
