import { parseServerAddress, queryServersA2S, type A2SQueryTarget } from './a2s.ts';

type FavoriteNameQuery = (
  targets: A2SQueryTarget[],
) => Promise<Array<{ success: boolean; name?: string }>>;

export async function resolveFavoriteServerNames(
  addresses: readonly string[],
  queryBatch: FavoriteNameQuery = queryServersA2S,
): Promise<Record<string, string>> {
  const entries: Array<{ address: string; target: A2SQueryTarget }> = [];
  for (const address of addresses) {
    const parsed = parseServerAddress(address);
    if (!parsed) continue;
    entries.push({ address, target: parsed });
  }
  if (entries.length === 0) return {};

  const results = await queryBatch(entries.map(entry => entry.target));
  const names: Record<string, string> = {};
  entries.forEach((entry, index) => {
    const result = results[index];
    if (result?.success && result.name) names[entry.address] = result.name;
  });
  return names;
}
