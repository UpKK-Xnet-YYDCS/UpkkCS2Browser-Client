import assert from 'node:assert/strict';
import test from 'node:test';
import { createAITokenAccumulator, estimateAITokens } from './aiTokens.ts';

test('incremental token counts match full scans for every prefix, including split surrogates', () => {
  const samples = [
    '',
    '  ',
    'hello world',
    '寻找延迟最低的服务器',
    'hello 世界 🎮',
    'a'.repeat(7),
    '🚀' + '测'.repeat(3) + '  end',
  ];

  for (const sample of samples) {
    const units = [...sample];
    const accumulator = createAITokenAccumulator();
    let prefix = '';
    assert.equal(accumulator.value(), estimateAITokens(prefix));
    for (const unit of units) {
      prefix += unit;
      accumulator.append(unit);
      assert.equal(accumulator.value(), estimateAITokens(prefix), prefix);
    }
  }

  const emoji = '🎮';
  assert.equal(emoji.length, 2);
  const split = createAITokenAccumulator();
  split.append(emoji.charAt(0));
  assert.equal(split.value(), 0);
  split.append(emoji.charAt(1));
  assert.equal(split.value(), estimateAITokens(emoji));
});
