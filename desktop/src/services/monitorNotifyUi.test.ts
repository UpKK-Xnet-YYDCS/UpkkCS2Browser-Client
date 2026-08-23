import assert from 'node:assert/strict';
import test from 'node:test';
import {
  notifyChannelTestButtonClass,
  notifyDesktopTestButtonClass,
  notifyPlaceholderLookupKey,
  notifyPreviewSample,
  notifyTestLabel,
  createNotifyTestMatch,
  runNotifyTest,
  notifyChannelInputClass,
} from './monitorNotifyUi.ts';

const labels = {
  testing: 'testing',
  success: 'ok',
  failed: 'bad',
  idle: 'idle',
};

test('notifyTestLabel covers idle, testing, success and failure', () => {
  assert.equal(notifyTestLabel(null, labels), 'idle');
  assert.equal(notifyTestLabel('testing', labels), 'testing');
  assert.equal(notifyTestLabel('success', labels), '✓ ok');
  assert.equal(notifyTestLabel('failed', labels), '✗ bad');
});

test('notify test button classes keep success and failure colors', () => {
  assert.match(notifyDesktopTestButtonClass('success'), /bg-green-100/);
  assert.match(notifyDesktopTestButtonClass('failed'), /bg-red-100/);
  assert.match(notifyDesktopTestButtonClass(null), /bg-gray-200/);
  assert.match(notifyChannelTestButtonClass('success', 'bg-purple-500 text-white'), /bg-green-500/);
  assert.match(notifyChannelTestButtonClass(null, 'bg-purple-500 text-white hover:bg-purple-600'), /bg-purple-500/);
});

test('placeholder keys strip braces and preview sample stays stable', () => {
  assert.equal(notifyPlaceholderLookupKey('{map}'), 'monitorPlaceholder_map');
  const sample = notifyPreviewSample('2026-01-01T00:00:00.000Z');
  assert.equal(sample.serverKey, '127.0.0.1:27015');
  assert.equal(sample.matchedAt, '2026-01-01T00:00:00.000Z');
});

test('createNotifyTestMatch keeps the live test payload', () => {
  const match = createNotifyTestMatch('2026-01-01T00:00:00.000Z');
  assert.equal(match.serverName, 'Test Server');
  assert.equal(match.mapName, 'ze_test_map');
  assert.equal(match.matchedRule, 'Test Rule');
  assert.equal(match.matchedAt, '2026-01-01T00:00:00.000Z');
});

test('runNotifyTest records success then clears after the existing delay', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const results: Array<string | null> = [];
  await runNotifyTest((result) => { results.push(result); }, async () => true);
  assert.deepEqual(results, ['testing', 'success']);
  t.mock.timers.tick(3000);
  assert.deepEqual(results, ['testing', 'success', null]);
});

test('notifyChannelInputClass keeps the existing focus and surface classes', () => {
  assert.equal(
    notifyChannelInputClass('focus:ring-[#5865F2]/20 focus:border-[#5865F2]'),
    'w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-[#5865F2]/20 focus:border-[#5865F2] transition-all',
  );
});
