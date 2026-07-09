import { useEffect, type RefObject } from 'react';

/**
 * A hook that reliably renders a chart on an HTML5 canvas element.
 *
 * It solves three common problems with raw canvas rendering:
 * 1. Canvas may have zero dimensions when inside a modal/tab that hasn't laid out yet.
 *    The hook retries with requestAnimationFrame until the canvas has non-zero size.
 * 2. Canvas doesn't automatically redraw when its container resizes.
 *    The hook uses ResizeObserver to trigger redraws on size changes.
 * 3. HiDPI / Retina displays need explicit devicePixelRatio scaling.
 *    The hook handles DPI-aware sizing before calling the draw function.
 *
 * @param canvasRef - React ref to the <canvas> element
 * @param drawFn   - Pure drawing function receiving (ctx, width, height) in CSS pixels.
 *                   The context is already DPI-scaled; draw using CSS-pixel coordinates.
 * Redraws whenever the caller's memoized draw function changes.
 */
export function useCanvasChart(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  drawFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 20; // ~330 ms total across rAF frames

    const draw = () => {
      rafId = null;
      const cvs = canvasRef.current;
      if (!cvs) return;

      const rect = cvs.getBoundingClientRect();

      // If the canvas has no dimensions yet, schedule a retry via rAF.
      if (rect.width === 0 || rect.height === 0) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          rafId = requestAnimationFrame(draw);
        }
        return;
      }
      // Reset retry counter on successful draw (for future resize triggers)
      retryCount = 0;

      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, rect.width, rect.height);
      drawFn(ctx, rect.width, rect.height);
    };

    // Initial draw (via rAF to ensure layout is settled after React commit)
    rafId = requestAnimationFrame(draw);

    // Re-draw whenever the canvas element resizes (container resize, window resize, etc.)
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(draw);
      });
      observer.observe(canvas);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [canvasRef, drawFn]);
}
