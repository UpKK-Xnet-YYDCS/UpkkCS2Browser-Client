import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dispatchMonitorNotificationsInOrder,
  type MonitorNotificationChannel,
} from './monitorNotifications.ts';

test('monitor notifications preserve match and channel order across failures', async () => {
  const calls: string[] = [];
  const errors: string[] = [];
  const sender = (channel: MonitorNotificationChannel) => async (entry: string) => {
    calls.push(`${entry}:${channel}`);
    if (entry === 'rule-1/server-1' && channel === 'discord') throw new Error('failed');
  };

  await dispatchMonitorNotificationsInOrder(
    ['rule-1/server-1', 'rule-1/server-2', 'rule-2/server-1'],
    { desktop: true, discord: true, serverChan: true, customWebhook: true },
    {
      desktop: sender('desktop'),
      discord: sender('discord'),
      serverChan: sender('serverChan'),
      customWebhook: sender('customWebhook'),
    },
    (channel) => errors.push(channel),
  );

  assert.deepEqual(calls, [
    'rule-1/server-1:desktop',
    'rule-1/server-1:discord',
    'rule-1/server-1:serverChan',
    'rule-1/server-1:customWebhook',
    'rule-1/server-2:desktop',
    'rule-1/server-2:discord',
    'rule-1/server-2:serverChan',
    'rule-1/server-2:customWebhook',
    'rule-2/server-1:desktop',
    'rule-2/server-1:discord',
    'rule-2/server-1:serverChan',
    'rule-2/server-1:customWebhook',
  ]);
  assert.deepEqual(errors, ['discord']);
});
