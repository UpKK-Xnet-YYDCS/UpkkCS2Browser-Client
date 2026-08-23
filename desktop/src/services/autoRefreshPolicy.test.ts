import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptCustomRefreshInput,
  intervalFromCustomRefreshInput,
  isPredefinedAutoRefreshValue,
  normalizeCustomRefreshBlur,
  resolveAutoRefreshSelection,
} from './autoRefreshPolicy.ts';

test('custom refresh selection keeps a positive current interval', () => {
  assert.deepEqual(resolveAutoRefreshSelection(-1, 90), { custom: true, interval: 90 });
  assert.deepEqual(resolveAutoRefreshSelection(-1, 0), { custom: true, interval: 60 });
  assert.deepEqual(resolveAutoRefreshSelection(30, 90), { custom: false, interval: 30 });
  assert.equal(isPredefinedAutoRefreshValue(120), true);
  assert.equal(isPredefinedAutoRefreshValue(15), false);
});

test('custom refresh input only commits integers of at least 10 seconds', () => {
  assert.equal(acceptCustomRefreshInput(''), true);
  assert.equal(acceptCustomRefreshInput('12'), true);
  assert.equal(acceptCustomRefreshInput('12.5'), false);
  assert.equal(acceptCustomRefreshInput('-1'), false);
  assert.equal(intervalFromCustomRefreshInput(''), null);
  assert.equal(intervalFromCustomRefreshInput('9'), null);
  assert.equal(intervalFromCustomRefreshInput('10'), 10);
  assert.deepEqual(normalizeCustomRefreshBlur(''), { display: '10', interval: 10 });
  assert.deepEqual(normalizeCustomRefreshBlur('75.9'), { display: '75', interval: 75 });
});
