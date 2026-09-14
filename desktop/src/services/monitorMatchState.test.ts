import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateMatchGate,
  isDuplicateNotification,
  pruneMonitorMatchState,
  recordMatchNotification,
  resetConsecutiveMatch,
  resetMonitorMatchState,
  setMonitorMatchNow,
  trackConsecutiveMatch,
  updatePreviousSeenMap,
} from './monitorMatchState.ts';

test('consecutive matches reset when the map changes', () => {
  resetMonitorMatchState();
  assert.equal(trackConsecutiveMatch('r1', '1.1.1.1:27015', 'ze_a'), 1);
  assert.equal(trackConsecutiveMatch('r1', '1.1.1.1:27015', 'ze_a'), 2);
  assert.equal(trackConsecutiveMatch('r1', '1.1.1.1:27015', 'ze_b'), 1);
  resetConsecutiveMatch('r1', '1.1.1.1:27015');
  assert.equal(trackConsecutiveMatch('r1', '1.1.1.1:27015', 'ze_b'), 1);
});

test('match gate waits for required hits, then cooldown and duplicate suppression', () => {
  resetMonitorMatchState();
  let current = 1_000;
  setMonitorMatchNow(() => current);

  assert.equal(evaluateMatchGate({
    ruleId: 'r1', serverKey: '1.1.1.1:27015', mapName: 'ze_a',
    requiredMatches: 2, cooldownSeconds: 60,
  }), 'wait_consecutive');
  assert.equal(evaluateMatchGate({
    ruleId: 'r1', serverKey: '1.1.1.1:27015', mapName: 'ze_a',
    requiredMatches: 2, cooldownSeconds: 60,
  }), 'notify');
  recordMatchNotification('r1', '1.1.1.1:27015', 'ze_a');
  updatePreviousSeenMap('r1', '1.1.1.1:27015', 'ze_a');

  current += 10_000;
  assert.equal(evaluateMatchGate({
    ruleId: 'r1', serverKey: '1.1.1.1:27015', mapName: 'ze_a',
    requiredMatches: 2, cooldownSeconds: 60,
  }), 'cooldown');

  current += 60_000;
  assert.equal(evaluateMatchGate({
    ruleId: 'r1', serverKey: '1.1.1.1:27015', mapName: 'ze_a',
    requiredMatches: 2, cooldownSeconds: 60,
  }), 'duplicate');
  assert.equal(isDuplicateNotification('r1', '1.1.1.1:27015', 'ze_a'), true);

  updatePreviousSeenMap('r1', '1.1.1.1:27015', 'ze_b');
  assert.equal(evaluateMatchGate({
    ruleId: 'r1', serverKey: '1.1.1.1:27015', mapName: 'ze_a',
    requiredMatches: 1, cooldownSeconds: 60,
  }), 'notify');
});

test('pruning removes deleted rules and keeps live cooldown state', () => {
  resetMonitorMatchState();
  let current = 1_000;
  setMonitorMatchNow(() => current);
  recordMatchNotification('keep', '1.1.1.1:27015', 'ze_a');
  recordMatchNotification('drop', '2.2.2.2:27015', 'ze_b');
  pruneMonitorMatchState(['keep']);
  current += 10_000;
  assert.equal(evaluateMatchGate({
    ruleId: 'keep', serverKey: '1.1.1.1:27015', mapName: 'ze_a',
    requiredMatches: 1, cooldownSeconds: 60,
  }), 'cooldown');
  assert.equal(evaluateMatchGate({
    ruleId: 'drop', serverKey: '2.2.2.2:27015', mapName: 'ze_b',
    requiredMatches: 1, cooldownSeconds: 60,
  }), 'notify');
});
