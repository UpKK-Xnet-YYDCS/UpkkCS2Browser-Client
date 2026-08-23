import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPresetColorSelected,
  rgbaAlphaPercent,
  rgbaChannelGradient,
  rgbaToHex,
} from './themeUtils.ts';

const color = { r: 10, g: 20, b: 30, a: 0.4 };

test('rgbaChannelGradient keeps the existing channel endpoints', () => {
  assert.equal(rgbaChannelGradient('r', color), 'linear-gradient(to right, rgb(0, 20, 30), rgb(255, 20, 30))');
  assert.equal(rgbaChannelGradient('g', color), 'linear-gradient(to right, rgb(10, 0, 30), rgb(10, 255, 30))');
  assert.equal(rgbaChannelGradient('b', color), 'linear-gradient(to right, rgb(10, 20, 0), rgb(10, 20, 255))');
  assert.equal(rgbaChannelGradient('a', color), 'linear-gradient(to right, rgba(10, 20, 30, 0), rgba(10, 20, 30, 1))');
});

test('preset selection is case-insensitive against the hex form', () => {
  assert.equal(isPresetColorSelected(color, rgbaToHex(color)), true);
  assert.equal(isPresetColorSelected(color, '#0A141E'), true);
  assert.equal(isPresetColorSelected(color, '#ffffff'), false);
});

test('rgbaAlphaPercent rounds to a whole percent', () => {
  assert.equal(rgbaAlphaPercent(0.4), 40);
  assert.equal(rgbaAlphaPercent(0.405), 41);
});
