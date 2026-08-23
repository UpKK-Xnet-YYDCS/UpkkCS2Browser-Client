import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPlayerHistoryXAxisLabel,
  isPlayerHistoryDatePeriod,
  playerHistoryHoverCounts,
  playerHistorySeries,
} from './playerHistorySeries.ts';

test('playerHistorySeries prefers real_players and floors empty series at 1', () => {
  assert.deepEqual(playerHistorySeries([]), {
    realPlayers: [],
    bots: [],
    maxValue: 1,
  });

  assert.deepEqual(playerHistorySeries([
    { real_players: 5, bots: 2 },
    { players: 3 },
    { real_players: 0, bots: 0 },
  ]), {
    realPlayers: [5, 3, 0],
    bots: [2, 0, 0],
    maxValue: 5,
  });
});

test('playerHistoryHoverCounts matches series fallbacks', () => {
  assert.deepEqual(playerHistoryHoverCounts({ real_players: 8, players: 1, bots: 3 }), {
    realPlayers: 8,
    bots: 3,
  });
  assert.deepEqual(playerHistoryHoverCounts({ players: 4 }), {
    realPlayers: 4,
    bots: 0,
  });
});

test('player history x-axis uses short dates only for 7d/30d', () => {
  assert.equal(isPlayerHistoryDatePeriod('7d'), true);
  assert.equal(isPlayerHistoryDatePeriod('30d'), true);
  assert.equal(isPlayerHistoryDatePeriod('24h'), false);
  assert.equal(isPlayerHistoryDatePeriod('12h'), false);
  assert.equal(isPlayerHistoryDatePeriod('6h'), false);

  const timestamp = '2026-08-14T15:04:00.000Z';
  const dateLabel = formatPlayerHistoryXAxisLabel(timestamp, '7d');
  const timeLabel = formatPlayerHistoryXAxisLabel(timestamp, '24h');
  assert.equal(dateLabel, formatPlayerHistoryXAxisLabel(timestamp, '30d'));
  assert.notEqual(dateLabel, timeLabel);
  assert.ok(dateLabel.length > 0);
  assert.ok(timeLabel.length > 0);
});
