export const DEFAULT_FAVORITE_SERVER_PORT = '27015';
export const ADD_FAVORITE_FAILURE_MESSAGE = 'Failed to add';

export interface ParsedFavoriteAddressInput {
  ip: string;
  port: string;
  raw: string;
}

export function parseFavoriteAddressInput(
  raw: string,
  defaultPort = DEFAULT_FAVORITE_SERVER_PORT,
): ParsedFavoriteAddressInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  const ip = parts[0]?.trim();
  const port = parts[1]?.trim() || defaultPort;
  if (!ip) return null;
  return { ip, port, raw: trimmed };
}

export function favoriteAddDisplayName(name: string, fallbackAddress: string): string {
  return name.trim() || fallbackAddress;
}

export function favoriteAddFailureMessage(result: unknown): string {
  return (result as { error?: string } | undefined)?.error || ADD_FAVORITE_FAILURE_MESSAGE;
}
