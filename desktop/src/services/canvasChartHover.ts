export interface CanvasChartHoverPadding {
  left: number;
  right: number;
  tooltipHalf: number;
}

export interface CanvasChartHover {
  index: number;
  left: number;
  tooltipLeft: number;
}

export function pickCanvasChartHover(
  rect: Pick<DOMRect, 'width' | 'left'>,
  clientX: number,
  length: number,
  padding: CanvasChartHoverPadding,
): CanvasChartHover | null {
  if (length <= 0) return null;

  const chartWidth = rect.width - padding.left - padding.right;
  const relativeX = Math.min(
    Math.max(clientX - rect.left, padding.left),
    rect.width - padding.right,
  );
  const index = length <= 1
    ? 0
    : Math.min(
      length - 1,
      Math.max(0, Math.round(((relativeX - padding.left) / Math.max(chartWidth, 1)) * (length - 1))),
    );
  const left = length <= 1
    ? padding.left
    : padding.left + (chartWidth / (length - 1)) * index;

  return {
    index,
    left,
    tooltipLeft: Math.min(rect.width - padding.tooltipHalf, Math.max(padding.tooltipHalf, left)),
  };
}
