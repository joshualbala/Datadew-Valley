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

/** Blend two colors (t = 0 → a, 1 → b). */
const blend = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/**
 * An oak suffering near the data center (same 30×36 size as `oak`). `wilt`
 * 0–1: leaves yellow and brown, the canopy thins to show bare branches, and
 * dead leaves collect at the base.
 */
export function wiltedOak(p: PixelPainter, wilt: number): void {
  if (wilt >= 1) return deadOak(p);
  const dark = blend(C.leafDark, 0x6e6234, wilt);
  const mid = blend(C.leaf, 0x9a8a3e, wilt);
  const light = blend(C.leafLight, 0xbfa24e, wilt);
  const bare = C.trunkDark;
  p.rect(13, 22, 5, 14, C.trunk).rect(16, 22, 2, 14, C.trunkDark).rect(11, 34, 9, 2, C.trunk);
  // Bare branches that show through a thinning canopy.
  p.rect(8, 9, 1, 8, bare).px(7, 8, bare).px(9, 16, bare).rect(21, 7, 1, 9, bare).px(22, 6, bare).px(20, 15, bare);
  p.rect(14, 4, 1, 6, bare).px(13, 3, bare);
  p.disc(15, 16, 12, dark);
  p.disc(14, 18, 8, mid).disc(20, 13, 7, mid);
  if (wilt < 0.6) p.disc(9, 13, 7, mid).disc(15, 9, 7, mid);
  else p.disc(10, 15, 5, mid); // thin, patchy crown when badly wilted
  p.disc(18, 9, 3, light).disc(12, 12, 2, light).px(10, 10, light).px(17, 6, light);
  p.dither(4, 20, 22, 4, dark);
  // Gaps in the leaves and fallen leaves on the ground.
  for (const [x, y] of [[6, 14], [23, 18], [11, 21], [19, 21], [8, 18]]) p.px(x, y, 0x000000, 0.18 * wilt);
  for (const [x, y] of [[6, 35], [9, 34], [22, 35], [24, 34], [19, 35]]) p.px(x, y, blend(0xb88a3e, 0x8a5a2b, wilt));
}

/** A pine browning from the bottom up (same 22×42 size as `pine`). `wilt` 0–1. */
export function wiltedPine(p: PixelPainter, wilt: number): void {
  if (wilt >= 1) return deadPine(p);
  p.rect(10, 34, 3, 8, C.trunk).rect(12, 34, 1, 8, C.trunkDark);
  const tiers: [number, number][] = [[0, 12], [8, 16], [16, 20], [24, 22]];
  tiers.forEach(([ty, th], i) => {
    // Lower tiers brown more.
    const brown = Math.min(1, wilt * (0.55 + i * 0.22));
    const body = blend(C.pine, 0x8a7a3e, brown);
    const shade = blend(C.pineDark, 0x6a5a2e, brown);
    const edge = blend(C.pineLight, 0xb39a52, brown);
    for (let r = 0; r < th - 2; r++) {
      const half = Math.min(10, Math.floor((r + 2) / 1.6));
      p.rect(11 - half, ty + r, half * 2 + 1, 1, body);
      p.rect(11, ty + r, half + 1, 1, shade);
      p.px(11 - half, ty + r, edge);
    }
  });
  // Missing needles: bare twigs on the lowest tier.
  if (wilt > 0.3) p.px(3, 30, C.trunkDark).px(2, 31, C.trunkDark).px(19, 29, C.trunkDark).px(20, 30, C.trunkDark);
  p.px(5, 41, 0xa8803a).px(17, 41, 0xa8803a).px(8, 40, 0x8a6a2e);
}

/** A dead oak: gray, bare, forked branches and a few last brown leaves (30×36). */
export function deadOak(p: PixelPainter): void {
  const bark = 0x6b5a48;
  const shade = 0x4e4136;
  const twig = 0x7d6b58;
  p.rect(13, 18, 5, 18, bark).rect(16, 18, 2, 18, shade).rect(11, 34, 9, 2, bark);
  // Main limbs.
  for (let i = 0; i < 10; i++) p.px(12 - i, 18 - i, bark).px(13 - i, 18 - i, bark);
  for (let i = 0; i < 9; i++) p.px(18 + i, 17 - i, bark).px(17 + i, 17 - i, shade);
  p.rect(14, 3, 2, 15, bark).px(15, 3, shade);
  // Twigs.
  for (const [x, y, dx, dy, n] of [[5, 10, -1, -1, 4], [8, 13, 1, -1, 3], [24, 10, 1, -1, 4], [21, 12, -1, -1, 3], [15, 6, -1, -1, 4], [15, 8, 1, -1, 4], [3, 9, 1, -1, 2]]) {
    for (let i = 0; i < n; i++) p.px(x + dx * i, y + dy * i, twig);
  }
  // A crack and a few last leaves.
  p.rect(15, 24, 1, 5, shade).px(14, 26, shade);
  for (const [x, y] of [[4, 6], [26, 6], [12, 3], [21, 9]]) p.px(x, y, 0x9a6a2e);
  for (const [x, y] of [[7, 35], [10, 34], [21, 35], [24, 35]]) p.px(x, y, 0x8a5a2b);
}

/** A dead pine: bare gray trunk with drooping, needle-less branches (22×42). */
export function deadPine(p: PixelPainter): void {
  const bark = 0x6b5a48;
  const shade = 0x4e4136;
  const brown = 0x7a5e3a;
  p.rect(10, 2, 2, 40, bark).rect(11, 2, 1, 40, shade).px(10, 0, bark).px(10, 1, bark);
  for (let tier = 0; tier < 6; tier++) {
    const y = 8 + tier * 5;
    const reach = 3 + tier;
    for (let i = 1; i <= reach; i++) {
      const droop = Math.floor(i / 3);
      p.px(10 - i, y + droop, bark).px(11 + i, y + droop, bark);
    }
    // A few clinging brown needles.
    if (tier % 2) p.px(10 - reach, y + 2, brown).px(11 + reach - 1, y + 2, brown);
  }
  p.px(6, 41, 0x8a6a2e).px(15, 41, 0x8a6a2e);
}
