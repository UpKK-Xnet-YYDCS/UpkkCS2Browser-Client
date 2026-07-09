export type SteamClient = 'steam' | 'steamchina';

// CS2/CSGO AppIDs
const CS_APP_IDS = [730, 740, 4465480];
// CS2/CSGO game names (pre-lowercased for comparison)
const CS_GAME_NAMES_LOWER = ['counter-strike 2', 'counter-strike: global offensive'];

export const getSteamProtocol = (): string => {
  const client = localStorage.getItem('steamClient') as SteamClient || 'steam';
  return client === 'steamchina' ? 'steamchina' : 'steam';
};

/**
 * Check if a server is a CS2/CSGO server based on appid and game name.
 * Returns true if CS, false if non-CS, or null if unknown (no info provided).
 */
export const isCSGame = (gameId?: number, gameName?: string): boolean | null => {
  if (gameId && gameId > 0) {
    return CS_APP_IDS.includes(gameId);
  }
  if (gameName) {
    return CS_GAME_NAMES_LOWER.includes(gameName.toLowerCase());
  }
  return null;
};

/**
 * Get the rungame App ID based on server game name.
 * CSGO servers (game name "Counter-Strike: Global Offensive") use appid 4465480.
 * CS2 and all other CS servers use the default appid 730.
 */
function getRungameAppId(gameName?: string): number {
  if (gameName && gameName.toLowerCase() === 'counter-strike: global offensive') {
    return 4465480;
  }
  return 730;
}

/**
 * 构建完整的加入游戏 URL
 * If the server is a non-CS game (appid not 730/740/4465480 and game name not CS2/CSGO),
 * use steam://connect/address:port for better game compatibility.
 * If no game info is available or server is CS, use the CS launch method.
 * CSGO servers (game name "Counter-Strike: Global Offensive") use appid 4465480.
 */
export const buildJoinUrl = (address: string, port: number | string, gameId?: number, gameName?: string): string => {
  const protocol = getSteamProtocol();
  const csCheck = isCSGame(gameId, gameName);
  if (csCheck === false) {
    return `${protocol}://connect/${address}:${port}`;
  }
  const appId = getRungameAppId(gameName);
  return `${protocol}://rungame/${appId}/76561202255233023/+connect ${address}:${port}`;
};

export const getSteamClient = (): SteamClient => {
  const saved = localStorage.getItem('steamClient') as SteamClient;
  return (saved === 'steam' || saved === 'steamchina') ? saved : 'steam';
};

export const setSteamClient = (client: SteamClient) => {
  localStorage.setItem('steamClient', client);
};
