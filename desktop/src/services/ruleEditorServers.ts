export const RULE_EDITOR_SERVERS_PER_PAGE = 10;

export interface RuleEditorCloudServer {
  server_ip: string;
  server_port: string | number;
  current_name?: string;
  server_name?: string;
  map_name?: string;
}

export interface RuleEditorServerEntry {
  key: string;
  name: string;
  map: string;
  source: 'cloud' | 'local';
}

export function buildRuleEditorServerEntries(
  favoriteServers: readonly RuleEditorCloudServer[],
  localFavorites: readonly string[],
  localServerNames: Record<string, string>,
): RuleEditorServerEntry[] {
  const cloudKeys = new Set(favoriteServers.map(server => server.server_ip + ':' + server.server_port));
  const cloudEntries = favoriteServers.map(server => {
    const key = server.server_ip + ':' + server.server_port;
    return {
      key,
      name: server.current_name || server.server_name || key,
      map: server.map_name || '',
      source: 'cloud' as const,
    };
  });
  const localEntries = localFavorites
    .filter(addr => !cloudKeys.has(addr))
    .map(addr => ({
      key: addr,
      name: localServerNames[addr] || addr,
      map: '',
      source: 'local' as const,
    }));
  return [...cloudEntries, ...localEntries];
}

export function filterRuleEditorServers(
  entries: readonly RuleEditorServerEntry[],
  query: string,
): RuleEditorServerEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter(entry => (
    entry.name.toLowerCase().includes(q)
    || entry.key.toLowerCase().includes(q)
    || entry.map.toLowerCase().includes(q)
  ));
}

export function paginateRuleEditorServers(
  entries: readonly RuleEditorServerEntry[],
  page: number,
  perPage = RULE_EDITOR_SERVERS_PER_PAGE,
): { pageItems: RuleEditorServerEntry[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(entries.length / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return {
    pageItems: entries.slice((safePage - 1) * perPage, safePage * perPage),
    totalPages,
  };
}

export function toggleSelectedServer(selected: string[], serverKey: string): string[] {
  return selected.includes(serverKey)
    ? selected.filter(key => key !== serverKey)
    : [...selected, serverKey];
}

export function addUniqueMapPattern(patterns: string[], pattern: string): string[] {
  const trimmed = pattern.trim();
  if (!trimmed || patterns.includes(trimmed)) return patterns;
  return [...patterns, trimmed];
}
