import { normalizeCloudAuthResponse, type CloudAuthStatus, type CloudUserInfo } from '@/services/cloudAuthData';
import { getOptionalDesktopHttpFetch } from '@/services/desktopRuntime';
import {
  XPROJ_USER_AGENT,
  clearApiToken,
  fetchApi,
  getBaseUrl,
} from './client';

export type UserInfo = CloudUserInfo;
export type AuthStatus = CloudAuthStatus;

// Check login status
export const checkAuthStatus = async (): Promise<AuthStatus> => {
  return normalizeCloudAuthResponse(await fetchApi<unknown>('/api/auth/user'));
};

// Get login URL for Steam (opens in browser)
export const getSteamLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/steam/login?desktop=1`;
};

// Get login URL for Google OAuth (opens in browser)
export const getGoogleLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/google/login?desktop=1`;
};

// Get login URL for Discord OAuth (opens in browser)
export const getDiscordLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/discord/login?desktop=1`;
};

// Get login URL for Upkk forum OAuth (opens in browser)
export const getUpkkLoginUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/upkk/login?desktop=1`;
};

// Logout current user
export const logout = async (): Promise<void> => {
  // Clear the API token
  clearApiToken();
  
  const baseUrl = getBaseUrl();
  try {
    // Try Tauri HTTP plugin first
    const tauriFetch = await getOptionalDesktopHttpFetch();
    if (tauriFetch) {
      await tauriFetch(`${baseUrl}/auth/logout`, {
        headers: {
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-UA': XPROJ_USER_AGENT,
        },
      });
    } else {
      // Fallback to regular fetch
      await fetch(`${baseUrl}/auth/logout`, {
        headers: {
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-UA': XPROJ_USER_AGENT,
        },
      });
    }
  } catch {
    // Ignore logout errors
  }
};

