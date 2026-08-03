import assert from 'node:assert/strict';
import test from 'node:test';
import { FavoriteAddressSubscriptions } from './favoriteAddresses.ts';

test('favorite subscriptions notify only addresses whose membership changed', () => {
  const subscriptions = new FavoriteAddressSubscriptions();
  const notifications: string[] = [];
  subscriptions.subscribe('one:1', () => notifications.push('one'));
  subscriptions.subscribe('two:2', () => notifications.push('two'));

  subscriptions.notifyChanges(new Set(['one:1']), new Set(['one:1', 'two:2']));
  assert.deepEqual(notifications, ['two']);

  subscriptions.notifyChanges(new Set(['one:1', 'two:2']), new Set(['two:2']));
  assert.deepEqual(notifications, ['two', 'one']);
});

test('unsubscribed favorite addresses no longer receive updates', () => {
  const subscriptions = new FavoriteAddressSubscriptions();
  let notifications = 0;
  const unsubscribe = subscriptions.subscribe('one:1', () => { notifications += 1; });
  unsubscribe();
  subscriptions.notifyChanges(new Set(), new Set(['one:1']));
  assert.equal(notifications, 0);
});
