import assert from 'node:assert/strict';
import test from 'node:test';
import { pickCanvasChartHover } from './canvasChartHover.ts';

const playerPadding = { left: 40, right: 20, tooltipHalf: 104 };
const queryPadding = { left: 50, right: 20, tooltipHalf: 112 };

test('pickCanvasChartHover returns null for an empty series', () => {
  assert.equal(pickCanvasChartHover({ width: 400, left: 10 }, 200, 0, playerPadding), null);
});

test('pickCanvasChartHover keeps a single point on the left padding', () => {
  const hover = pickCanvasChartHover({ width: 400, left: 0 }, 300, 1, playerPadding);
  assert.deepEqual(hover, {
    index: 0,
    left: 40,
    tooltipLeft: 104,
  });
});

test('pickCanvasChartHover maps N points across the plot and clamps past the edges', () => {
  const rect = { width: 400, left: 0 };
  const leftEdge = pickCanvasChartHover(rect, -50, 3, playerPadding);
  const mid = pickCanvasChartHover(rect, 210, 3, playerPadding);
  const rightEdge = pickCanvasChartHover(rect, 10_000, 3, playerPadding);

  assert.deepEqual(leftEdge, { index: 0, left: 40, tooltipLeft: 104 });
  assert.deepEqual(mid, { index: 1, left: 210, tooltipLeft: 210 });
  assert.deepEqual(rightEdge, { index: 2, left: 380, tooltipLeft: 296 });
});

test('pickCanvasChartHover clamps tooltips with the query-records half width', () => {
  const wide = pickCanvasChartHover({ width: 400, left: 0 }, 50, 5, queryPadding);
  const right = pickCanvasChartHover({ width: 400, left: 0 }, 380, 5, queryPadding);

  assert.equal(wide?.index, 0);
  assert.equal(wide?.left, 50);
  assert.equal(wide?.tooltipLeft, 112);
  assert.equal(right?.index, 4);
  assert.equal(right?.left, 380);
  assert.equal(right?.tooltipLeft, 288);
});

test('pickCanvasChartHover can clamp tooltip inside a narrow canvas', () => {
  const hover = pickCanvasChartHover({ width: 200, left: 0 }, 110, 3, playerPadding);
  assert.deepEqual(hover, { index: 1, left: 110, tooltipLeft: 96 });
});
