import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLAYER_HISTORY_CHART_PADDING,
  QUERY_RECORDS_CHART_PADDING,
  canvasChartLabelStep,
  canvasChartPlotRect,
  canvasChartX,
  canvasChartY,
} from './canvasLineChart.ts';

test('canvasChartPlotRect subtracts the existing player-history padding', () => {
  assert.deepEqual(canvasChartPlotRect(400, 160, PLAYER_HISTORY_CHART_PADDING), {
    width: 340,
    height: 110,
    left: 40,
    top: 20,
  });
});

test('canvasChartPlotRect subtracts the existing query-records padding', () => {
  assert.deepEqual(canvasChartPlotRect(400, 160, QUERY_RECORDS_CHART_PADDING), {
    width: 330,
    height: 110,
    left: 50,
    top: 20,
  });
});

test('canvasChartX keeps a single point on the left padding', () => {
  const plot = canvasChartPlotRect(400, 160, PLAYER_HISTORY_CHART_PADDING);
  assert.equal(canvasChartX(0, 1, plot), 40);
  assert.equal(canvasChartX(0, 3, plot), 40);
  assert.equal(canvasChartX(1, 3, plot), 210);
  assert.equal(canvasChartX(2, 3, plot), 380);
});

test('canvasChartY maps zero to the plot floor and max to the plot top', () => {
  const plot = canvasChartPlotRect(400, 160, PLAYER_HISTORY_CHART_PADDING);
  assert.equal(canvasChartY(0, 100, plot), 130);
  assert.equal(canvasChartY(100, 100, plot), 20);
  assert.equal(canvasChartY(50, 100, plot), 75);
});

test('canvasChartLabelStep matches the existing six-label cadence', () => {
  assert.equal(canvasChartLabelStep(0), 1);
  assert.equal(canvasChartLabelStep(1), 1);
  assert.equal(canvasChartLabelStep(6), 1);
  assert.equal(canvasChartLabelStep(12), 2);
  assert.equal(canvasChartLabelStep(13), 2);
});
