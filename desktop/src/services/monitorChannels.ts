import { showToast } from '@/services/toast';
import type { MatchedServer } from './monitorTypes';
import { formatNotificationMessage, getMapPreviewUrl } from './monitorMessage';
import {
  buildCustomWebhookPayload,
  buildDiscordWebhookBody,
  buildServerChanRequest,
  isServerChanAccepted,
  isValidServerChanSendKey,
  isWebhookAccepted,
} from './monitorChannelPayloads';
import { postMonitorJson } from './postMonitorJson';

export { formatNotificationMessage, getMapPreviewUrl };

export async function sendDesktopNotification(
  title: string,
  body: string
): Promise<boolean> {
  // Always show in-app toast notification (Telegram-style, bottom-right)
  showToast(title, body, 'info', 8000);

  // Also try system-level notification (best effort)
  try {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body });
      }
    } catch {
      // Tauri notification not available, try Web Notification API
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    }
  } catch (err) {
    console.error('[Monitor] System notification failed:', err);
  }
  return true;
}

/**
 * Send Discord webhook notification
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  server: MatchedServer,
  alertTitle?: string
): Promise<boolean> {
  if (!webhookUrl) return false;

  try {
    const response = await postMonitorJson(webhookUrl, buildDiscordWebhookBody(server, alertTitle));
    return isWebhookAccepted(response);
  } catch (err) {
    console.error('[Monitor] Discord webhook failed:', err);
    return false;
  }
}

/**
 * Send Server Chan (Server酱) notification
 * Server Chan pushes messages to WeChat via its API.
 * API docs: https://sct.ftqq.com/
 */
export async function sendServerChanNotification(
  sendKey: string,
  server: MatchedServer,
  alertTitle?: string
): Promise<boolean> {
  if (!sendKey) return false;
  if (!isValidServerChanSendKey(sendKey)) return false;

  const request = buildServerChanRequest(sendKey, server, alertTitle);
  try {
    const response = await postMonitorJson(request.url, request.body);
    return isServerChanAccepted(response);
  } catch (err) {
    console.error('[Monitor] Server Chan notification failed:', err);
    return false;
  }
}

/**
 * Send notification to a custom webhook URL via HTTP POST.
 * The webhook receives a JSON payload with all server match details.
 * This is intended for users with development capabilities who want to
 * integrate with custom bots or services (e.g., QQ group bots).
 *
 * POST JSON body fields:
 *  - event: "map_alert" (string, event type identifier)
 *  - server_name: server name (string)
 *  - map_name: current map name (string)
 *  - players: current player count (number)
 *  - max_players: max player slots (number)
 *  - address: server address "ip:port" (string)
 *  - rule_name: matched rule name (string)
 *  - matched_pattern: matched map pattern (string)
 *  - timestamp: ISO 8601 timestamp (string)
 *  - message: formatted message using custom template (string)
 *  - map_image_url: map preview image URL (string)
 */
export async function sendCustomWebhook(
  webhookUrl: string,
  server: MatchedServer,
  customMessage?: string
): Promise<boolean> {
  if (!webhookUrl) return false;

  try {
    const response = await postMonitorJson(webhookUrl, buildCustomWebhookPayload(server, customMessage));
    return isWebhookAccepted(response);
  } catch (err) {
    console.error('[Monitor] Custom webhook failed:', err);
    return false;
  }
}

