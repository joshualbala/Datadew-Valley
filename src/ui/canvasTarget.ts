import type { PixelTarget } from '../game/art/pixel';

/** Lets PixelPainter draw onto a plain 2D canvas (still pictures in pop-ups, avatars on the website). */
export function canvasTarget(ctx: CanvasRenderingContext2D): PixelTarget {
  return {
    fillStyle(color: number, alpha = 1) {
      ctx.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${alpha})`;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      ctx.fillRect(x, y, w, h);
    },
  };
}
