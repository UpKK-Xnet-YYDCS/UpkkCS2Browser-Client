export type SearchAlias = {from: string; to: string[]; enabled: boolean};
export type SearchConfig = {revision: number; aliases: SearchAlias[]};
export const defaultSearchConfig: SearchConfig = {revision: 1, aliases: [{from: '93x', to: ['upkk'], enabled: true}]};

// Unicode White_Space matches Go unicode.IsSpace; JavaScript \s differs for U+0085/U+FEFF.
const trimSearchWhitespace = (value: string) => value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
const findSearchAlias = (term: string, aliases: readonly SearchAlias[]) => aliases.find(alias => alias.enabled && trimSearchWhitespace(alias.from).toLowerCase() === term);

export function parseSearch(raw: string, aliases: readonly SearchAlias[] = []): string[][][] {
  return raw.split(/[,，;；\r\n]+/u).map(group => [...new Set(group.toLowerCase().split(/\p{White_Space}+/u).filter(Boolean))].map(term => {
    const alias = findSearchAlias(term, aliases);
    return alias ? alias.to.map(word => trimSearchWhitespace(word).toLowerCase()) : [term];
  })).filter(group => group.length);
}
const matchesSearchGroups = (groups: string[][][], fields: readonly string[]) => fields.some(field => groups.some(group => group.every(choices => choices.some(word => field.toLowerCase().includes(word)))));

export function matchesSearch(raw: string, fields: readonly string[], aliases: readonly SearchAlias[] = []): boolean {
  const groups = parseSearch(raw, aliases);
  return !groups.length || matchesSearchGroups(groups, fields);
}
export function matchesServerSearch(raw: string, name: string, fields: readonly string[], config = defaultSearchConfig): boolean {
  if (matchesSearch(raw, [name], config.aliases)) return true;
  // Groups using a name mapping cannot fall back to literal map/address matches.
  const literalGroups = parseSearch(raw).filter(group => group.every(([term]) => !findSearchAlias(term, config.aliases)));
  return matchesSearchGroups(literalGroups, fields);
}
export function parseSearchConfig(value: unknown): SearchConfig {
  if (!value || typeof value !== 'object') throw new Error('Invalid search configuration');
  const data = value as Record<string, unknown>;
  if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 1 || !Array.isArray(data.aliases) || data.aliases.length > 100) throw new Error('Invalid search configuration');
  for (const item of data.aliases) {
    if (!item || typeof item.from !== 'string' || !Array.isArray(item.to) || item.to.length > 10 || item.to.some((word: unknown) => typeof word !== 'string' || word.length > 320) || typeof item.enabled !== 'boolean') throw new Error('Invalid search alias');
  }
  return {revision: Number(data.revision), aliases: data.aliases as SearchAlias[]};
}
