import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLatencyProbeServerLabel, formatProbeMs, formatProbePercent, getNumericProbeInput } from './latencyProbeFormat.ts';

test('getNumericProbeInput keeps finite numbers and falls back otherwise', () => {
  assert.equal(getNumericProbeInput('2.5', 1), 2.5);
  assert.equal(getNumericProbeInput('', 3), 0);
  assert.equal(getNumericProbeInput('   ', 3), 0);
  assert.equal(getNumericProbeInput('nope', 4), 4);
});

test('formatLatencyProbeServerLabel trims and prefers display host then ip', () => {
  assert.equal(
    formatLatencyProbeServerLabel({ ip: '1.1.1.1', port: '27015', display_address: 'example.com:27015' }),
    'example.com:27015',
  );
  assert.equal(
    formatLatencyProbeServerLabel({ ip: ' 2.2.2.2 ', port: ' 27016 ', display_address: '  ' }),
    '2.2.2.2:27016',
  );
  assert.equal(
    formatLatencyProbeServerLabel({ ip: '', port: '', display_address: 'only-host' }),
    'only-host',
  );
});

test('formatProbeMs keeps the dash fallback and rounded ms label', () => {
  assert.equal(formatProbeMs(undefined), '--');
  assert.equal(formatProbeMs(Number.NaN), '--');
  assert.equal(formatProbeMs(12.4), '12 ms');
  assert.equal(formatProbeMs(12.6), '13 ms');
});

test('formatProbePercent drops trailing zeros only for whole numbers', () => {
  assert.equal(formatProbePercent(0), '0%');
  assert.equal(formatProbePercent(12), '12%');
  assert.equal(formatProbePercent(12.5), '12.50%');
});
