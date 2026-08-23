import { invokeDesktop, openExternalUrl } from '@/services/desktopRuntime';
import { logDebug, logInfo } from '@/services/operationLog';
import { FORUM_URL } from './forumConstants';

export { FORUM_URL } from './forumConstants';
export { formatForumWindowError } from './forumWindowFormat';

export interface ForumWindowSession {
  uid: number;
  username: string;
  user_auth: string;
}

export async function openForumDesktopWindow(session?: ForumWindowSession | null): Promise<void> {
  logInfo('Forum', 'Attempting to open forum...');
  logDebug('Forum', 'Importing Tauri API...');
  if (session) {
    logInfo('Forum', 'Opening forum with POST login for user: ' + session.username);
    await invokeDesktop('open_forum_with_login', {
      uid: String(session.uid),
      auth: session.user_auth,
    });
  } else {
    logInfo('Forum', 'Opening forum without login');
    await invokeDesktop('open_forum_window');
  }
  logInfo('Forum', 'Forum window opened successfully');
}

export async function openForumExternalBrowser(): Promise<void> {
  try {
    await openExternalUrl(FORUM_URL);
    logInfo('Forum', 'Opened in system browser via Tauri shell: ' + FORUM_URL);
  } catch (error) {
    console.error('[Forum] Failed to open via Tauri shell, falling back:', error);
    window.location.href = FORUM_URL;
  }
}

export async function openCheckInForumWindow(): Promise<void> {
  try {
    await invokeDesktop('open_forum_window');
    logInfo('CheckIn', 'Forum opened in WebView2 window');
  } catch (error) {
    console.error('[CheckIn] Failed to open forum via Tauri:', error);
    try {
      await openExternalUrl(FORUM_URL);
    } catch {
      window.location.href = FORUM_URL;
    }
  }
}
