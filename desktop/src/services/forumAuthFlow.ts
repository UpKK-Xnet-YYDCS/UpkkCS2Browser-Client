import type { LoginResponse, UserSession } from '../types/user.ts';
import { formatForumLoginError, sessionFromLoginResponse } from './forumLoginParse.ts';

export const FORUM_LOGIN_FAILURE_MESSAGE = '登录失败';

export type ForumAuthAttempt =
  | { type: 'authenticated'; data: LoginResponse; session: UserSession }
  | { type: 'rejected'; data: LoginResponse; message: string }
  | { type: 'failed'; error: unknown };

export type ForumCredentialPersistResult =
  | { type: 'saved' }
  | { type: 'failed'; message?: string }
  | { type: 'threw'; error: unknown };

export type ForumAutoLoginPrep =
  | { type: 'no-credentials' }
  | { type: 'load-failed'; message?: string }
  | { type: 'ready'; steamid64: string; securecode: string };

export function forumLoginFailureMessage(message?: string): string {
  return message || FORUM_LOGIN_FAILURE_MESSAGE;
}

export function forumLoginRequestErrorMessage(error: unknown): string {
  return formatForumLoginError(error);
}

export async function authenticateForumUser(
  steamid64: string,
  securecode: string,
  request: (id: string, code: string) => Promise<LoginResponse>,
): Promise<ForumAuthAttempt> {
  try {
    const data = await request(steamid64, securecode);
    const session = sessionFromLoginResponse(data);
    if (!session) {
      return { type: 'rejected', data, message: forumLoginFailureMessage(data.message) };
    }
    return { type: 'authenticated', data, session };
  } catch (error) {
    return { type: 'failed', error };
  }
}

export async function persistRememberedForumCredentials(
  steamid64: string,
  securecode: string,
  save: (id: string, code: string) => Promise<{ success: boolean; message?: string }>,
): Promise<ForumCredentialPersistResult> {
  try {
    const saveResult = await save(steamid64, securecode);
    return saveResult.success ? { type: 'saved' } : { type: 'failed', message: saveResult.message };
  } catch (error) {
    return { type: 'threw', error };
  }
}

export async function prepareForumAutoLogin(deps: {
  hasStoredCredentials: () => Promise<boolean>;
  loadCredentials: () => Promise<{ success?: boolean; steamid64?: string; securecode?: string; message?: string }>;
}): Promise<ForumAutoLoginPrep> {
  const hasCredentials = await deps.hasStoredCredentials();
  if (!hasCredentials) return { type: 'no-credentials' };
  const result = await deps.loadCredentials();
  if (!result.success || !result.steamid64 || !result.securecode) {
    return { type: 'load-failed', message: result.message };
  }
  return { type: 'ready', steamid64: result.steamid64, securecode: result.securecode };
}
