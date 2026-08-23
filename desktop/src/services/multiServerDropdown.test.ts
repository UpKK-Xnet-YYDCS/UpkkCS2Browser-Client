import assert from 'node:assert/strict';
import test from 'node:test';
import { placeMultiServerDropdown } from './multiServerDropdown.ts';

const rect = { top: 120, left: 40, bottom: 156 };

test('placeMultiServerDropdown opens upward or downward from the trigger', () => {
  assert.deepEqual(
    placeMultiServerDropdown(rect, { placement: 'up', viewportWidth: 800 }),
    { top: 116, left: 40 },
  );
  assert.deepEqual(
    placeMultiServerDropdown(rect, { placement: 'down', viewportWidth: 800 }),
    { top: 160, left: 40 },
  );
});

test('placeMultiServerDropdown keeps the panel inside the viewport', () => {
  const right = placeMultiServerDropdown(
    { top: 20, left: 700, bottom: 50 },
    { placement: 'down', viewportWidth: 800 },
  );
  assert.equal(right.left, 472);

  const left = placeMultiServerDropdown(
    { top: 20, left: -40, bottom: 50 },
    { placement: 'down', viewportWidth: 800 },
  );
  assert.equal(left.left, 8);
});
