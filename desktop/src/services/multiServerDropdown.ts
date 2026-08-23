export type MultiServerDropdownPlacement = 'up' | 'down';

export interface MultiServerDropdownRect {
  top: number;
  left: number;
  bottom: number;
}

export function placeMultiServerDropdown(
  rect: MultiServerDropdownRect,
  options: {
    placement: MultiServerDropdownPlacement;
    width?: number;
    margin?: number;
    viewportWidth: number;
  },
): { top: number; left: number } {
  const width = options.width ?? 320;
  const margin = options.margin ?? 8;
  let left = rect.left;
  if (left + width > options.viewportWidth - margin) {
    left = options.viewportWidth - width - margin;
  }
  if (left < margin) left = margin;
  const top = options.placement === 'up' ? rect.top - 4 : rect.bottom + 4;
  return { top, left };
}
