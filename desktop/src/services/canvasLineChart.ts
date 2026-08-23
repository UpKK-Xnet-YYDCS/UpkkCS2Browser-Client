export interface CanvasLineChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CanvasChartPlotRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

export const PLAYER_HISTORY_CHART_PADDING: CanvasLineChartPadding = {
  top: 20,
  right: 20,
  bottom: 30,
  left: 40,
};

export const QUERY_RECORDS_CHART_PADDING: CanvasLineChartPadding = {
  top: 20,
  right: 20,
  bottom: 30,
  left: 50,
};

export function canvasChartPlotRect(
  width: number,
  height: number,
  padding: CanvasLineChartPadding,
): CanvasChartPlotRect {
  return {
    width: width - padding.left - padding.right,
    height: height - padding.top - padding.bottom,
    left: padding.left,
    top: padding.top,
  };
}

export function canvasChartX(index: number, length: number, plot: CanvasChartPlotRect): number {
  return plot.left + (plot.width / (length - 1 || 1)) * index;
}

export function canvasChartY(value: number, maxValue: number, plot: CanvasChartPlotRect): number {
  return plot.top + plot.height - (value / maxValue) * plot.height;
}

export function canvasChartLabelStep(length: number, maxLabels = 6): number {
  const labelCount = Math.min(maxLabels, length);
  return Math.floor(length / labelCount) || 1;
}

export function drawCanvasGridAndYAxis(
  ctx: CanvasRenderingContext2D,
  plot: CanvasChartPlotRect,
  maxValue: number,
  options: {
    gridLines?: number;
    gridColor: string;
    labelColor: string;
    font: string;
    formatLabel: (value: number) => string;
  },
): void {
  const gridLines = options.gridLines ?? 5;
  ctx.strokeStyle = options.gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i++) {
    const y = plot.top + (plot.height / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();

    const value = Math.round(maxValue - (maxValue / gridLines) * i);
    ctx.fillStyle = options.labelColor;
    ctx.font = options.font;
    ctx.textAlign = 'right';
    ctx.fillText(options.formatLabel(value), plot.left - 5, y + 4);
  }
}

export function drawCanvasXAxisLabels(
  ctx: CanvasRenderingContext2D,
  canvasHeight: number,
  plot: CanvasChartPlotRect,
  length: number,
  options: {
    color: string;
    font: string;
    getLabel: (index: number) => string;
    maxLabels?: number;
  },
): void {
  const labelStep = canvasChartLabelStep(length, options.maxLabels ?? 6);
  ctx.fillStyle = options.color;
  ctx.font = options.font;
  ctx.textAlign = 'center';
  for (let i = 0; i < length; i += labelStep) {
    ctx.fillText(options.getLabel(i), canvasChartX(i, length, plot), canvasHeight - 8);
  }
}

export function drawCanvasAreaLine(
  ctx: CanvasRenderingContext2D,
  plot: CanvasChartPlotRect,
  data: readonly number[],
  maxValue: number,
  color: string,
  fillColor: string,
): void {
  if (data.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const xStep = plot.width / (data.length - 1 || 1);
  for (let i = 0; i < data.length; i++) {
    const x = plot.left + xStep * i;
    const y = canvasChartY(data[i], maxValue, plot);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.lineTo(plot.left + plot.width, plot.top + plot.height);
  ctx.lineTo(plot.left, plot.top + plot.height);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
}

export function drawCanvasFailureMarkers(
  ctx: CanvasRenderingContext2D,
  plot: CanvasChartPlotRect,
  data: readonly number[],
): void {
  const xStep = plot.width / (Math.max(data.length, 1) - 1 || 1);
  for (let i = 0; i < data.length; i++) {
    if (data[i] < 100) continue;
    const x = plot.left + xStep * i;
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.moveTo(x, plot.top + plot.height);
    ctx.lineTo(x, plot.top);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#ef4444';
    ctx.arc(x, plot.top + 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
