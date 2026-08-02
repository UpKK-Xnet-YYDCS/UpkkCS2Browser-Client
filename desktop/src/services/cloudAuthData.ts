export interface CloudUserInfo {
  id: number;
  steam_id?: string;
  username: string;
  avatar?: string;
  provider: 'steam' | 'google' | 'discord' | 'upkk';
}

export interface CloudAuthStatus {
  logged_in: boolean;
  user?: CloudUserInfo;
}

export function normalizeCloudAuthResponse(value: unknown): CloudAuthStatus {
  if (!value || typeof value !== 'object') return { logged_in: false };
  const response = value as Record<string, unknown>;
  if (!response.logged_in) return { logged_in: false };

  const source = response.user && typeof response.user === 'object'
    ? response.user as Record<string, unknown>
    : response;
  const id = Number(source.id);
  if (!Number.isFinite(id) || id <= 0) return { logged_in: false };
  const provider = String(source.provider || 'steam');
  if (!['steam', 'google', 'discord', 'upkk'].includes(provider)) return { logged_in: false };

  return {
    logged_in: true,
    user: {
      id,
      steam_id: optionalText(source.steam_id),
      username: optionalText(source.username) || optionalText(source.display_name) || 'User',
      avatar: optionalText(source.avatar) || optionalText(source.avatar_url),
      provider: provider as CloudUserInfo['provider'],
    },
  };
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim() || undefined;
}
