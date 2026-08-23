import { getCloudApiToken } from '@/services/cloudToken';

export const XPROJ_USER_AGENT = __XPROJ_HTTP_USER_AGENT__;

let cachedBaseUrl: string | null = null;

export const getBaseUrl = (): string => {
  if (cachedBaseUrl === null) {
    cachedBaseUrl = localStorage.getItem('apiBaseUrl') || 'https://servers.upkk.com';
  }
  return cachedBaseUrl;
};

export const writeApiBaseUrl = (url: string) => {
  cachedBaseUrl = url;
  localStorage.setItem('apiBaseUrl', url);
};

export const getApiBaseUrl = (): string => {
  return getBaseUrl();
};

export const getApiToken = (): string | null => {
  return getCloudApiToken();
};

