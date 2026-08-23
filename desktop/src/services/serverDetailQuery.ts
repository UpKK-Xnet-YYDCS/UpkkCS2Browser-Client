export const SERVER_DETAIL_COPY_FEEDBACK_MS = 2000;

export function buildServerDetailHistoryKeys(serverId: unknown, ip: string, port: string): {
  joinedAddress: string;
  historyServerId: string;
  historyAddress: string;
} {
  const joinedAddress = ip && port ? String(ip) + ':' + String(port) : '';
  return {
    joinedAddress,
    historyServerId: serverId ? String(serverId) : joinedAddress,
    historyAddress: joinedAddress,
  };
}

export function playersQueryKey(serverId: unknown, ip: string, port: string): number | string {
  return (serverId as number | string) || (ip + ':' + port);
}

export function shouldPrefetchCloudFavorite(
  isLoggedIn: boolean,
  cloudFavState: boolean | null,
  ip: string,
  port: string,
): boolean {
  return Boolean(isLoggedIn && cloudFavState === null && ip && port);
}

export function shouldPrefetchPlayers(serverPlayers: number): boolean {
  return serverPlayers > 0;
}

export function shouldPrefetchServerVersion(detailVersion: string, ip: string, port: string): boolean {
  return Boolean(!detailVersion && ip && port);
}

export function cloudFavoriteClickAction(cloudFavState: boolean | null | undefined): 'confirm-remove' | 'add' {
  return cloudFavState ? 'confirm-remove' : 'add';
}
