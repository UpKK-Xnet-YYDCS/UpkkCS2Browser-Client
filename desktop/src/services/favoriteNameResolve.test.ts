import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveFavoriteServerNames } from './favoriteNameResolve.ts';

test('favorite name resolution uses one ordered batch and skips failed names', async () => {
  const batches: string[] = [];
  const names = await resolveFavoriteServerNames(
    ['10.5.0.1:27015', 'not-an-address', '10.5.0.2:27016'],
    async (targets) => {
      batches.push(targets.map(target => `${target.ip}:${target.port}`).join(','));
      return [
        { success: true, name: 'Alpha' },
        { success: false, name: '' },
      ];
    },
  );

  assert.deepEqual(batches, ['10.5.0.1:27015,10.5.0.2:27016']);
  assert.deepEqual(names, { '10.5.0.1:27015': 'Alpha' });
});
