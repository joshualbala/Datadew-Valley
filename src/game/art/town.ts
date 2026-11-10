import { cottage, type CottageColors } from './illustrations/common';
import { C } from './palette';
import type { PixelPainter } from './pixel';

/**
 * Modern-town buildings and street props for the game map, drawn in code.
 * Buildings take a `variant` number so neighbors look different (colors,
 * shop signs); the map picks it from the building's position.
 */

const pick = <T>(items: readonly T[], variant: number): T => items[Math.abs(variant) % items.length];
const GLASS = 0x8fc3e0;
const GLASS_HI = 0xd8efff;
const TRIM = 0x2f3237;

// ------------------------------------------------------------------ houses

export const HOUSE_COLORS: readonly CottageColors[] = [
  { roof: 0x3f6fa8, roofDark: 0x2c4f7c, wall: 0xe9dcc4, wallShade: 0xcbbb9c },
  { roof: 0x4f8a4a, roofDark: 0x386636, wall: 0xf2dc8a, wallShade: 0xd6bd68 },
  { roof: 0x5b5f66, roofDark: 0x41454b, wall: 0xf0c4c0, wallShade: 0xd4a29e },
  { roof: 0x7a4f33, roofDark: 0x5a3822, wall: 0xbcd3b0, wallShade: 0x9db592 },
  { roof: 0x34383f, roofDark: 0x23262b, wall: 0xbfd8ec, wallShade: 0x9dbad2 },
  { roof: 0xc0673a, roofDark: 0x93492a, wall: 0xf7f4ee, wallShade: 0xd9d3c8 },
];

/** Gable-roof family house (48×48, ground at y 46). */
export function gableHouse(p: PixelPainter, variant: number): void {
  cottage(p, 2, 46, false, pick(HOUSE_COLORS, variant));
}

/** Flat-roof modern house with a big window and a wood (or colored) accent panel (48×46, ground at y 44). */
export function modernHouse(p: PixelPainter, variant: number): void {
  const wall = pick([0xf1f1ee, 0xd9dadc, 0xe6d8bf], variant);
  const accent = pick([0xb07a4a, 0x4a7a9a, 0xb5523b, 0x6b8f5a], variant + 1);
  const ground = 44;
  // Upper volume (set back) and main volume.
  p.rect(22, 4, 24, 12, wall).rect(22, 4, 24, 2, TRIM).rect(26, 8, 14, 6, GLASS).rect(26, 8, 14, 1, GLASS_HI);
  p.rect(2, 16, 44, ground - 16, wall).rect(0, 14, 48, 3, TRIM);
  // Accent panel with vertical boards.
  p.rect(32, 17, 14, ground - 17, accent);
  for (let x = 34; x < 46; x += 3) p.rect(x, 17, 1, ground - 17, 0x000000, 0.15);
  // Big window and door.
  p.rect(5, 21, 22, 15, TRIM).rect(6, 22, 20, 13, GLASS).rect(15, 22, 1, 13, TRIM);
  p.px(7, 23, GLASS_HI).px(8, 24, GLASS_HI).px(17, 23, GLASS_HI);
  p.rect(36, 28, 7, ground - 28, TRIM).px(41, 36, 0xc9a227);
  // Plinth and planter.
  p.rect(2, ground - 2, 44, 2, 0xa7a9ad);
  p.rect(5, ground - 6, 22, 4, 0x8a8f99).rect(6, ground - 8, 20, 2, C.leaf).px(9, ground - 9, C.flowers[0]).px(18, ground - 9, C.flowers[1]);
}

/** Two-story house with a porch (48×62, ground at y 60). */
export function tallHouse(p: PixelPainter, variant: number): void {
  const c = pick(HOUSE_COLORS, variant + 2);
  const ground = 60;
  const top = 22; // top of walls
  // Roof.
  for (let i = 0; i < 18; i++) {
    const half = Math.round(5 + i * 1.25);
    p.rect(24 - half, 4 + i, half * 2, 1, i % 4 === 3 ? c.roofDark : c.roof);
  }
  p.rect(0, top - 1, 48, 2, c.roofDark);
  p.disc(24, 13, 3, C.stone).disc(24, 13, 2, GLASS);
  // Siding.
  p.rect(3, top, 42, ground - top, c.wall);
  for (let y = top + 2; y < ground; y += 3) p.rect(3, y, 42, 1, c.wallShade);
  // Windows: two floors.
  for (const wx of [8, 21, 34]) {
    p.rect(wx - 1, top + 4, 8, 9, C.stone).rect(wx, top + 5, 6, 7, GLASS).rect(wx, top + 8, 6, 1, C.stone).px(wx + 1, top + 6, GLASS_HI);
    p.rect(wx - 2, top + 5, 1, 7, c.roofDark).rect(wx + 7, top + 5, 1, 7, c.roofDark); // shutters
  }
  for (const wx of [8, 34]) {
    p.rect(wx - 1, top + 20, 8, 9, C.stone).rect(wx, top + 21, 6, 7, GLASS).rect(wx, top + 24, 6, 1, C.stone);
  }
  // Porch with roof, posts and door.
  p.rect(16, top + 17, 16, 2, c.roofDark);
  p.rect(17, top + 19, 1, ground - top - 19, C.stone).rect(30, top + 19, 1, ground - top - 19, C.stone);
  p.rect(20, top + 22, 8, ground - top - 22, C.doorDark).rect(21, top + 23, 6, ground - top - 23, C.door).px(26, top + 30, C.gold);
  p.rect(15, ground - 2, 18, 2, C.stoneShade);
}

/** Corner shop: colored facade, striped awning, picture sign, display window (64×50, ground at y 48). */
export function shop(p: PixelPainter, variant: number): void {
  const facade = pick([0xb5523b, 0x3f8f8a, 0xd9a63a, 0x34507a], variant);
  const stripe = pick([0xd62828, 0x2f9e5a, 0x2e6fd6, 0xf28c28], variant + 1);
  const ground = 48;
  // Building with a parapet.
  p.rect(2, 4, 60, ground - 4, facade).rect(0, 2, 64, 4, 0x000000, 0.25).rect(0, 2, 64, 2, 0xffffff, 0.2);
  for (let y = 8; y < 22; y += 4) p.rect(2, y, 60, 1, 0x000000, 0.08);
  // Sign board with a picture of what the shop sells.
  p.rect(18, 7, 28, 12, 0xfff4d6).rect(18, 7, 28, 1, 0x000000, 0.2).rect(18, 18, 28, 1, 0x000000, 0.2);
  shopIcon(p, 32, 13, variant);
  // Awning.
  for (let x = 4; x < 60; x += 4) p.rect(x, 22, 2, 6, stripe).rect(x + 2, 22, 2, 6, 0xffffff);
  for (let x = 4; x < 60; x += 4) p.rect(x, 28, 4, 1, x % 8 ? stripe : 0xffffff);
  p.rect(4, 21, 56, 1, 0x000000, 0.3);
  // Display window and glass door.
  p.rect(6, 30, 32, 16, TRIM).rect(7, 31, 30, 14, GLASS).px(9, 32, GLASS_HI).px(10, 33, GLASS_HI);
  for (let i = 0; i < 5; i++) p.rect(10 + i * 5, 40, 3, 4, pick(C.flowers, i + variant)); // goods on the shelf
  p.rect(7, 39, 30, 1, TRIM);
  p.rect(44, 29, 12, ground - 29, TRIM).rect(45, 30, 10, ground - 30, GLASS).rect(49, 30, 1, ground - 30, TRIM);
  p.rect(2, ground - 2, 60, 2, 0x8a8f99);
}

/** A little picture on a shop sign (no words): coffee cup, bread, book or pharmacy cross. */
function shopIcon(p: PixelPainter, cx: number, cy: number, variant: number): void {
  const ink = 0x3a2412;
  switch (Math.abs(variant) % 4) {
    case 0: // coffee cup with steam
      p.rect(cx - 4, cy - 1, 7, 5, 0xffffff).rect(cx - 4, cy - 1, 7, 1, ink).rect(cx - 4, cy + 3, 7, 1, ink);
      p.rect(cx - 5, cy - 1, 1, 5, ink).rect(cx + 3, cy - 1, 1, 5, ink).rect(cx + 4, cy, 2, 1, ink).rect(cx + 5, cy + 1, 1, 2, ink);
      p.px(cx - 2, cy - 3, 0x9a9a9a).px(cx, cy - 4, 0x9a9a9a).px(cx - 1, cy - 2, 0x9a9a9a);
      break;
    case 1: // loaf of bread
      p.rect(cx - 6, cy - 2, 12, 5, 0xd9a05b).rect(cx - 5, cy - 3, 10, 1, 0xd9a05b).rect(cx - 6, cy + 2, 12, 1, 0xa66f32);
      for (let i = -3; i <= 3; i += 3) p.px(cx + i, cy - 1, 0xa66f32).px(cx + i + 1, cy - 2, 0xa66f32);
      break;
    case 2: // open book
      p.rect(cx - 7, cy - 3, 7, 7, 0xffffff).rect(cx + 1, cy - 3, 7, 7, 0xffffff).rect(cx, cy - 3, 1, 8, ink);
      for (let y = -1; y < 3; y += 2) p.rect(cx - 5, cy + y, 4, 1, 0x9a9a9a).rect(cx + 3, cy + y, 4, 1, 0x9a9a9a);
      break;
    default: // pharmacy cross
      p.rect(cx - 1, cy - 4, 3, 9, 0x2f9e5a).rect(cx - 4, cy - 1, 9, 3, 0x2f9e5a);
  }
}

// ------------------------------------------------------------------ street props

export function trashCan(p: PixelPainter, variant: number): void {
  const body = pick([0x3f7a4a, 0x4a5568, 0x2f5f9a], variant);
  p.rect(1, 4, 8, 10, body).rect(7, 4, 2, 10, 0x000000, 0.2);
  for (let x = 2; x < 8; x += 2) p.rect(x, 6, 1, 7, 0x000000, 0.15);
  p.rect(0, 2, 10, 3, body).rect(0, 2, 10, 1, 0xffffff, 0.25).rect(3, 1, 4, 1, TRIM);
  p.rect(1, 13, 2, 2, TRIM).rect(7, 13, 2, 2, TRIM);
}

export function stopSign(p: PixelPainter): void {
  p.rect(5, 10, 2, 16, 0x8a8f99);
  p.rect(3, 0, 6, 11, 0xd62828).rect(1, 2, 10, 7, 0xd62828).rect(2, 1, 8, 9, 0xd62828);
  p.rect(2, 4, 8, 3, 0xffffff).rect(3, 5, 6, 1, 0xd62828); // white band (no letters at this size)
  p.px(3, 1, 0xff6b6b).px(2, 2, 0xff6b6b);
}

export function streetSign(p: PixelPainter): void {
  p.rect(6, 4, 2, 22, 0x8a8f99);
  p.rect(0, 2, 14, 4, 0x2f7d4a).rect(1, 3, 12, 1, 0xffffff, 0.6);
  p.rect(3, 7, 8, 3, 0x2f7d4a).rect(4, 8, 6, 1, 0xffffff, 0.6);
  p.rect(6, 0, 2, 2, TRIM);
}

export function streetLamp(p: PixelPainter): void {
  p.rect(3, 6, 2, 30, 0x3a3d42).rect(2, 34, 4, 2, 0x3a3d42);
  p.rect(1, 2, 6, 4, 0x3a3d42).rect(2, 5, 4, 2, 0xfff2b0).px(3, 7, 0xfff2b0, 0.5).px(4, 7, 0xfff2b0, 0.5);
  p.rect(2, 0, 4, 2, 0x3a3d42);
}

export function bench(p: PixelPainter): void {
  const wood = 0xa8743e;
  p.rect(0, 1, 18, 2, wood).rect(0, 4, 18, 2, wood).rect(0, 8, 18, 2, 0xc48d52);
  p.rect(1, 6, 2, 6, TRIM).rect(15, 6, 2, 6, TRIM).rect(1, 0, 2, 8, TRIM).rect(15, 0, 2, 8, TRIM);
}

export function hydrant(p: PixelPainter): void {
  p.rect(2, 3, 5, 8, 0xd62828).rect(1, 2, 7, 2, 0xb01e1e).rect(3, 0, 3, 2, 0xd62828);
  p.rect(0, 5, 2, 2, 0xb01e1e).rect(7, 5, 2, 2, 0xb01e1e).px(3, 4, 0xff6b6b);
  p.rect(1, 11, 7, 1, 0x8a8f99);
}

export function mailbox(p: PixelPainter, variant: number, color?: number): void {
  const box = color ?? pick([0x2f5f9a, 0x4a5568, 0x3f7a4a, 0x8a5a2b], variant);
  p.rect(3, 7, 2, 9, 0x6b4423);
  p.rect(0, 1, 8, 6, box).rect(1, 0, 6, 1, box).rect(0, 6, 8, 1, 0x000000, 0.25);
  p.rect(8, 1, 1, 4, 0xd62828).rect(9, 1, 1, 2, 0xd62828);
}

/** Parked car seen from the side, facing right (34×18). */
export function car(p: PixelPainter, variant: number): void {
  const body = pick([0xc0392b, 0x2e6fd6, 0xeeeeee, 0xa7adb5, 0x2f7d4a, 0xe5b42f], variant);
  const shade = 0x000000;
  p.rect(1, 7, 32, 7, body).rect(1, 12, 32, 2, shade, 0.2);
  p.rect(7, 2, 18, 6, body).rect(8, 1, 15, 1, body);
  p.rect(9, 3, 7, 4, GLASS).rect(17, 3, 7, 4, GLASS).px(10, 3, GLASS_HI).px(18, 3, GLASS_HI);
  p.rect(16, 3, 1, 4, body);
  p.rect(31, 8, 2, 2, 0xfff2b0).rect(1, 8, 2, 2, 0xd62828); // lights
  p.rect(2, 10, 30, 1, shade, 0.15).rect(18, 9, 3, 1, shade, 0.35); // trim and handle
  for (const x of [8, 26]) p.disc(x, 14, 3, 0x1f1f1f).disc(x, 14, 1, 0xa7adb5);
}
