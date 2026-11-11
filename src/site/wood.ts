import { seeded } from '../game/art/illustrations/common';
import { PixelPainter } from '../game/art/pixel';
import { canvasTarget } from '../ui/canvasTarget';

/** Header texture size in art pixels (each drawn 3×3 on screen: 480×60). */
const W = 160;
const H = 20;
export const WOOD_SCALE = 3;

const SEAM = 0x5b3a1e;
const DARK = 0x3a2412;

/**
 * A pixel-art strip of wooden planks for the site header: three planks with
 * their own tones, grain streaks, knots, staggered joints held by nails, a
 * light top edge and a dark bottom edge. Tiles seamlessly left to right.
 * Returns a data URL to use as a CSS background.
 */
export function woodPlanksDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = W * WOOD_SCALE;
  canvas.height = H * WOOD_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const p = new PixelPainter(canvasTarget(ctx), WOOD_SCALE);
  const rng = seeded(1847);

  // Planks: [top, height, base, grain dark, grain light, joints].
  const planks: [number, number, number, number, number, number[]][] = [
    [1, 6, 0xc57d3d, 0xa4622c, 0xdc9658, [38, 118]],
    [8, 5, 0xb9733a, 0x98592a, 0xd08b50, [78, 150]],
    [14, 5, 0xca8442, 0xa86630, 0xe09d5e, [16, 96]],
  ];
  p.rect(0, 0, W, H, SEAM);
  p.rect(0, 0, W, 1, 0xe8ab6c); // light top edge
  for (const [top, h, base, dark, light, joints] of planks) {
    p.rect(0, top, W, h, base);
    // Grain: long thin streaks that wrap around so the strip tiles seamlessly.
    for (let i = 0; i < 26; i++) {
      const y = top + rng.between(0, h - 1);
      const x = rng.between(0, W - 1);
      const len = rng.between(6, 22);
      const color = rng.frac() < 0.7 ? dark : light;
      for (let k = 0; k < len; k++) p.px((x + k) % W, y, color, 0.75);
    }
    // A knot or two: a dark oval ring with a lighter middle.
    for (let i = 0; i < 2; i++) {
      const kx = rng.between(6, W - 8);
      const ky = top + Math.floor(h / 2);
      p.rect(kx - 2, ky, 5, 1, dark)
        .rect(kx - 1, ky - 1, 3, 3, dark)
        .px(kx, ky, light);
    }
    // Shading: a highlight along the top of the plank and a shadow under it.
    p.rect(0, top, W, 1, light, 0.5).rect(0, top + h - 1, W, 1, dark, 0.45);
    // Joints between boards, with a nail on each side.
    for (const jx of joints) {
      p.rect(jx, top, 1, h, SEAM);
      for (const nx of [jx - 2, jx + 2])
        p.px(nx, top + 1, 0x4a3a30)
          .px(nx, top + h - 2, 0x4a3a30)
          .px(nx, top + 1, 0x8a7a6a, 0.5);
    }
  }
  p.rect(0, H - 1, W, 1, DARK); // dark bottom edge
  return canvas.toDataURL();
}
