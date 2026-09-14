import { getCloudApiToken } from '../services/cloudToken.ts';

export const XPROJ_USER_AGENT = typeof __XPROJ_HTTP_USER_AGENT__ === 'string'
  ? __XPROJ_HTTP_USER_AGENT__
  : 'XProj-Desktop-HTTP';

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

