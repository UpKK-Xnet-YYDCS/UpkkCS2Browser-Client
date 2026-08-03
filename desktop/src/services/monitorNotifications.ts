export type MonitorNotificationChannel = 'desktop' | 'discord' | 'serverChan' | 'customWebhook';

export interface MonitorNotificationChannels {
  desktop: boolean;
  discord: boolean;
  serverChan: boolean;
  customWebhook: boolean;
}

export type MonitorNotificationSenders<T> = Record<
  MonitorNotificationChannel,
  (entry: T) => Promise<unknown>
>;

const channelOrder: MonitorNotificationChannel[] = [
  'desktop',
  'discord',
  'serverChan',
  'customWebhook',
];
const channelLabels: Record<MonitorNotificationChannel, string> = {
  desktop: 'Desktop',
  discord: 'Discord',
  serverChan: 'ServerChan',
  customWebhook: 'Custom webhook',
};

export async function dispatchMonitorNotificationsInOrder<T>(
  entries: readonly T[],
  enabled: MonitorNotificationChannels,
  senders: MonitorNotificationSenders<T>,
  onError: (channel: MonitorNotificationChannel, error: unknown) => void = (channel, error) => {
    console.error(`[Monitor] ${channelLabels[channel]} notification failed:`, error);
  },
): Promise<void> {
  for (const entry of entries) {
    for (const channel of channelOrder) {
      if (!enabled[channel]) continue;
      try {
        await senders[channel](entry);
      } catch (error) {
        onError(channel, error);
      }
    }
  }
}
