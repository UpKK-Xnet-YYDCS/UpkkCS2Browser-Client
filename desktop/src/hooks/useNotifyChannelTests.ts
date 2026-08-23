import { useState } from 'react';
import {
  formatNotificationMessage,
  sendCustomWebhook,
  sendDesktopNotification,
  sendDiscordWebhook,
  sendServerChanNotification,
  type MonitorNotifySettings,
} from '@/services/monitor';
import { createNotifyTestMatch, runNotifyTest } from '@/services/monitorNotifyUi';

export function useNotifyChannelTests(notifySettings: MonitorNotifySettings) {
  const [desktopTestResult, setDesktopTestResult] = useState<string | null>(null);
  const [discordTestResult, setDiscordTestResult] = useState<string | null>(null);
  const [serverChanTestResult, setServerChanTestResult] = useState<string | null>(null);
  const [customWebhookTestResult, setCustomWebhookTestResult] = useState<string | null>(null);

  const handleTestDesktop = async () => {
    await runNotifyTest(setDesktopTestResult, () => sendDesktopNotification(
      '🎮 Test Notification',
      'Server Monitor is working correctly!',
    ));
  };

  const handleTestWebhook = async () => {
    if (!notifySettings.discordWebhookUrl) return;
    const testMatch = createNotifyTestMatch();
    await runNotifyTest(setDiscordTestResult, () => sendDiscordWebhook(
      notifySettings.discordWebhookUrl,
      testMatch,
      notifySettings.alertTitle || undefined,
    ));
  };

  const handleTestServerChan = async () => {
    if (!notifySettings.serverChanKey) return;
    const testMatch = createNotifyTestMatch();
    await runNotifyTest(setServerChanTestResult, () => sendServerChanNotification(
      notifySettings.serverChanKey,
      testMatch,
      notifySettings.alertTitle || undefined,
    ));
  };

  const handleTestCustomWebhook = async () => {
    if (!notifySettings.customWebhookUrl) return;
    const testMatch = createNotifyTestMatch();
    const customMsg = formatNotificationMessage(notifySettings.customMessageTemplate, testMatch);
    await runNotifyTest(setCustomWebhookTestResult, () => sendCustomWebhook(
      notifySettings.customWebhookUrl,
      testMatch,
      customMsg,
    ));
  };

  return {
    desktopTestResult,
    discordTestResult,
    serverChanTestResult,
    customWebhookTestResult,
    handleTestDesktop,
    handleTestWebhook,
    handleTestServerChan,
    handleTestCustomWebhook,
  };
}
