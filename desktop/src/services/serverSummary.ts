import {getApiBaseUrl} from '@/api/client';
import type {Language} from '@/i18n/types';
import {isDesktopRuntime, openExternalUrl} from './desktopRuntime';

// The deployment supplies its Web entry point; no API token is placed in a URL.
export async function openServerSummary(language: Language): Promise<void> {
  const url = `${getApiBaseUrl()}/api/servers/summary/config?open=1&lang=${encodeURIComponent(language)}`;
  if (isDesktopRuntime()) await openExternalUrl(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
