import assert from 'node:assert/strict';
import test from 'node:test';
import {
  autoJoinAvailableSlots,
  autoJoinTriggerThreshold,
  clampAutoJoinInterval,
  clampAutoJoinMinSlots,
  nextAutoJoinCountdown,
  readAutoJoinCountsFromA2S,
  readAutoJoinCountsFromApi,
  readStoredAutoJoinInterval,
  readStoredAutoJoinMinSlots,
  shouldAutoJoin,
} from './autoJoinPolicy.ts';

test('clampAutoJoinMinSlots keeps values inside 1-10', () => {
  assert.equal(clampAutoJoinMinSlots('4'), 4);
  assert.equal(clampAutoJoinMinSlots('0'), 1);
  assert.equal(clampAutoJoinMinSlots('99'), 10);
  assert.equal(clampAutoJoinMinSlots('abc'), 1);
});

test('clampAutoJoinInterval keeps integers inside 2-300', () => {
  assert.equal(clampAutoJoinInterval('7'), 7);
  assert.equal(clampAutoJoinInterval('1'), 2);
  assert.equal(clampAutoJoinInterval('400'), 300);
  assert.equal(clampAutoJoinInterval('-3'), 7);
  assert.equal(clampAutoJoinInterval('nope'), 7);
});

test('shouldAutoJoin uses remaining slots against the threshold', () => {
  assert.equal(autoJoinAvailableSlots(60, 64), 4);
  assert.equal(shouldAutoJoin(60, 64, 4), true);
  assert.equal(shouldAutoJoin(61, 64, 4), false);
});

test('stored auto-join settings fall back to defaults', () => {
  assert.equal(readStoredAutoJoinMinSlots({ getItem: () => null }), 4);
  assert.equal(readStoredAutoJoinInterval({ getItem: () => '12' }), 12);
});


test('reads auto-join player counts from A2S and API payloads', () => {
  assert.equal(readAutoJoinCountsFromA2S(null), null);
  assert.equal(readAutoJoinCountsFromA2S({ success: false, real_players: 10, max_players: 64 }), null);
  assert.deepEqual(readAutoJoinCountsFromA2S({ success: true, real_players: 12, max_players: 32 }), {
    realPlayers: 12,
    maxPlayers: 32,
  });
  assert.deepEqual(readAutoJoinCountsFromApi({ Players: 8, MaxPlayers: 20 }), {
    realPlayers: 8,
    maxPlayers: 20,
  });
  assert.deepEqual(readAutoJoinCountsFromApi({ real_players: 3 }), {
    realPlayers: 3,
    maxPlayers: 64,
  });
});

test('countdown wraps to the interval and trigger threshold never goes negative', () => {
  assert.equal(nextAutoJoinCountdown(3, 7), 2);
  assert.equal(nextAutoJoinCountdown(1, 7), 7);
  assert.equal(autoJoinTriggerThreshold(64, 4), 60);
  assert.equal(autoJoinTriggerThreshold(2, 4), 0);
});
