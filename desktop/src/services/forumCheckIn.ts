import { XPROJ_USER_AGENT } from '@/api/clientConfig';
import { getDesktopHttpFetch } from '@/services/desktopRuntime';
import { logDebug } from '@/services/operationLog';
import { CHECK_IN_ENDPOINT, FORUM_URL } from './forumConstants';
import { parseCheckInPayload, type CheckInResult } from './forumCheckInParse';

export type { CheckInResult } from './forumCheckInParse';
export {
  checkInStatusGradient,
  formatCheckInRequestError,
  parseCheckInPayload,
} from './forumCheckInParse';

async function readCheckInResponse(response: Response): Promise<CheckInResult> {
  if (!response.ok) {
    throw new Error('请求失败: ' + response.status);
  }
  const data = await response.json() as { status?: number; message?: string };
  return parseCheckInPayload(data);
}

export async function requestForumCheckIn(uid: number, auth: string): Promise<CheckInResult> {
  const postBody = new URLSearchParams({
    uid: String(uid),
    auth,
  }).toString();
  const url = FORUM_URL + CHECK_IN_ENDPOINT;

  try {
    const tauriFetch = await getDesktopHttpFetch();
    const response = await tauriFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': XPROJ_USER_AGENT,
      },
      body: postBody,
    });
    return await readCheckInResponse(response);
  } catch {
    logDebug('CheckIn', 'Tauri HTTP not available, falling back to fetch');
  }

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': XPROJ_USER_AGENT,
      'X-Client-UA': XPROJ_USER_AGENT,
    },
    body: postBody,
  });
  return readCheckInResponse(response);
}
