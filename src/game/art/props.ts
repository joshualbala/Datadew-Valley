import type { PixelPainter } from './pixel';
import { C } from './palette';

/**
 * Small scenery props drawn at their own (0, 0). Use `p.at(x, y)` to place one inside a bigger picture,
 * or makeTexture with the listed size to make a sprite.
 */

/** 22×42 art px, origin top-left. */
export const PINE_SIZE = [22, 42] as const;
export function pine(p: PixelPainter): void {
  p.rect(10, 34, 3, 8, C.trunk).rect(12, 34, 1, 8, C.trunkDark);
  const tiers: [number, number][] = [[0, 12], [8, 16], [16, 20], [24, 22]];
  for (const [ty, th] of tiers) {
    for (let i = 0; i < th - 2; i++) {
      const half = Math.min(10, Math.floor((i + 2) / 1.6));
      p.rect(11 - half, ty + i, half * 2 + 1, 1, C.pine);
      p.rect(11, ty + i, half + 1, 1, C.pineDark);
      p.px(11 - half, ty + i, C.pineLight);
    }
  }
  p.px(10, 2, C.pineLight).px(8, 12, C.pineLight).px(6, 21, C.pineLight).px(5, 29, C.pineLight);
}

/** 30×36 art px, origin top-left. */
export const OAK_SIZE = [30, 36] as const;
export function oak(p: PixelPainter): void {
  p.rect(13, 22, 5, 14, C.trunk).rect(16, 22, 2, 14, C.trunkDark).rect(11, 34, 9, 2, C.trunk);
  p.disc(15, 15, 13, C.leafDark);
  p.disc(9, 13, 8, C.leaf).disc(20, 12, 8, C.leaf).disc(15, 8, 8, C.leaf).disc(14, 18, 8, C.leaf);
  p.disc(11, 8, 4, C.leafLight).disc(18, 6, 3, C.leafLight).disc(7, 13, 3, C.leafLight);
  p.px(10, 6, C.leafHi).px(17, 4, C.leafHi).px(6, 11, C.leafHi);
  p.dither(4, 20, 22, 4, C.leafDark);
  // A couple of apples for charm.
  p.px(8, 17, 0xe0483e).px(21, 16, 0xe0483e).px(15, 21, 0xe0483e);
}

/** 20×11 art px, origin top-left. */
export const BUSH_SIZE = [20, 11] as const;
export function bush(p: PixelPainter): void {
  p.disc(6, 7, 5, C.leafDark).disc(13, 6, 6, C.leafDark).disc(6, 6, 4, C.leaf).disc(13, 5, 5, C.leaf);
  p.px(5, 3, C.leafLight).px(12, 1, C.leafLight).px(15, 3, C.leafLight).px(9, 6, C.flowers[0]).px(16, 7, C.flowers[1]);
}

export function tuft(p: PixelPainter, x: number, y: number): void {
p.px(x, y, C.tuft).px(x - 1, y - 1, C.tuft).px(x + 1, y - 1, C.tuft).px(x, y - 2, C.meadowLight);
}
