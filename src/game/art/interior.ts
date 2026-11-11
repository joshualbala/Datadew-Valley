import type { PixelPainter } from './pixel';

/**
 * Inside the data center (and the floodlight posts around it), drawn in code
 * for the top-down map. Sizes are in art pixels; each sprite stands on the
 * bottom edge of its footprint. `LEDS_*` list where blinking status lights go
 * (x, y inside the sprite) so the map can animate them.
 */

const STEEL = 0x3a3f46;
const STEEL_DARK = 0x23262b;
const STEEL_LIGHT = 0x5a616b;
const PANEL = 0xd9dde3;
const PANEL_SHADE = 0xb5bcc5;
const HAZARD = 0xf2c230;
const COOL = 0x3d8bff;

// ------------------------------------------------------------------ outside

/** Tall floodlight post (12×50): gray pole, twin lamp head facing the viewer. */
export function floodlightPost(p: PixelPainter): void {
  p.rect(5, 10, 2, 38, 0x6b7280).rect(6, 10, 1, 38, 0x4a5058).rect(3, 47, 6, 3, 0x4a5058);
  p.rect(1, 6, 10, 2, 0x4a5058).rect(5, 4, 2, 4, 0x4a5058);
  // Lamp housings with bright faces (the glare effect adds the light).
  p.rect(0, 0, 5, 6, STEEL).rect(7, 0, 5, 6, STEEL);
  p.rect(1, 1, 3, 4, 0xfffbe6).rect(8, 1, 3, 4, 0xfffbe6);
}

// ------------------------------------------------------------------ racks

/** Server rack (16×40, footprint 1×2): black cabinet, mesh door, drive bays. */
export function serverRack(p: PixelPainter): void {
  p.rect(0, 0, 16, 40, STEEL_DARK).rect(0, 0, 16, 2, STEEL).rect(0, 38, 16, 2, 0x111316);
  p.rect(1, 2, 1, 36, STEEL).rect(14, 2, 1, 36, STEEL);
  for (let y = 5; y < 36; y += 6) {
    p.rect(3, y, 10, 4, 0x2f343b).rect(3, y, 10, 1, STEEL_LIGHT);
    for (let x = 4; x < 12; x += 2) p.px(x, y + 2, 0x1a1d21);
  }
  // Handle.
  p.rect(13, 16, 1, 6, 0x8a8f99);
}
export const LEDS_RACK: [number, number][] = [
  [4, 7],
  [7, 7],
  [4, 13],
  [9, 13],
  [6, 19],
  [4, 25],
  [10, 25],
  [7, 31],
];

/** GPU rack (16×40): like a server rack, with green-lit GPU trays and fans. */
export function gpuRack(p: PixelPainter): void {
  serverRack(p);
  for (let y = 5; y < 36; y += 6) {
    p.rect(3, y, 10, 4, 0x1e2a1a).rect(3, y, 10, 1, 0x76b900);
    p.disc(6, y + 2, 1, 0x3a4a30).disc(10, y + 2, 1, 0x3a4a30);
  }
}
export const LEDS_GPU: [number, number][] = [
  [3, 8],
  [12, 8],
  [3, 14],
  [12, 20],
  [3, 26],
  [12, 32],
];

// ------------------------------------------------------------------ cooling and water

/** Cooling unit (32×44, footprint 2×2): white cabinet, two fan grilles, coolant pipes. */
export function coolingUnit(p: PixelPainter): void {
  // Pipes rising into the ceiling.
  p.rect(5, 0, 3, 10, COOL).rect(6, 0, 1, 10, 0x8fc3ff).rect(24, 0, 3, 10, 0x2f6fd6).rect(25, 0, 1, 10, 0x6aa6ff);
  p.rect(0, 8, 32, 36, PANEL).rect(0, 8, 32, 2, 0xffffff).rect(30, 8, 2, 36, PANEL_SHADE).rect(0, 42, 32, 2, 0x8a919a);
  for (const cx of [9, 23]) {
    p.disc(cx, 21, 6, 0x5a616b).disc(cx, 21, 5, 0x3a3f46);
    for (let i = -4; i <= 4; i += 2) p.rect(cx - 4, 21 + i, 9, 1, 0x6b7280);
    p.disc(cx, 21, 1, 0x8a8f99);
  }
  // Display and snowflake label.
  p.rect(4, 31, 12, 6, 0x1a2a3a).rect(5, 32, 6, 1, 0x6fe3ff).rect(5, 34, 4, 1, 0x6fe3ff);
  const s = 0x3d8bff;
  p.rect(23, 30, 1, 9, s).rect(19, 34, 9, 1, s).px(21, 32, s).px(25, 32, s).px(21, 36, s).px(25, 36, s);
}
export const LEDS_COOLING: [number, number][] = [
  [14, 33],
  [14, 35],
];

/** Municipal water tank (32×46, footprint 2×2): blue tank, bands, gauge, water-drop sign, inlet pipe. */
export function waterTank(p: PixelPainter): void {
  // Inlet pipe from the city water main (runs into the wall).
  p.rect(0, 30, 4, 4, 0x6b7280).rect(0, 30, 4, 1, 0x9aa0a8);
  // Tank body: a rounded cylinder.
  p.rect(4, 6, 24, 38, 0x2f6fb3).rect(4, 6, 6, 38, 0x4a8fd6).rect(24, 6, 4, 38, 0x24578e);
  p.rect(6, 3, 20, 3, 0x2f6fb3).rect(8, 1, 16, 2, 0x2f6fb3).rect(8, 1, 6, 2, 0x4a8fd6);
  for (const y of [12, 26, 38]) p.rect(4, y, 24, 2, 0x5a616b);
  // Water-drop sign.
  p.disc(16, 21, 3, 0xffffff).rect(15, 15, 3, 3, 0xffffff).px(16, 14, 0xffffff).disc(16, 21, 2, 0x5fb8ff).rect(16, 17, 1, 3, 0x5fb8ff);
  // Pressure gauge.
  p.disc(23, 32, 3, 0xeeeeee).disc(23, 32, 2, 0xffffff).rect(23, 30, 1, 2, 0xd62828);
  // Legs.
  p.rect(6, 44, 3, 2, STEEL).rect(23, 44, 3, 2, STEEL);
}

// ------------------------------------------------------------------ power

/** Power cabinet (16×40): gray cabinet, hazard stripes, lightning bolt, meters. */
export function powerCabinet(p: PixelPainter): void {
  p.rect(0, 0, 16, 40, 0x8a919a).rect(0, 0, 16, 2, 0xb5bcc5).rect(14, 0, 2, 40, 0x6b7280).rect(0, 38, 16, 2, 0x4a5058);
  p.rect(7, 2, 1, 36, 0x6b7280);
  // Lightning bolt on a yellow triangle.
  for (let i = 0; i < 7; i++) p.rect(8 - i, 6 + i, 1 + i * 2, 1, HAZARD);
  p.rect(8, 7, 1, 3, 0x111316).px(7, 10, 0x111316).rect(8, 10, 1, 2, 0x111316);
  // Meters.
  p.rect(3, 17, 4, 4, 0xeeeeee).px(5, 18, 0xd62828).rect(9, 17, 4, 4, 0xeeeeee).px(10, 19, 0xd62828);
  // Hazard stripes at the bottom.
  for (let x = 0; x < 16; x += 4) p.rect(x, 33, 2, 4, HAZARD).rect(x + 2, 33, 2, 4, 0x111316);
}
export const LEDS_POWER: [number, number][] = [
  [3, 25],
  [6, 25],
  [9, 25],
  [12, 25],
];

/** Transformer (32×40, footprint 2×2): finned box, high-voltage sign, thick cables. */
export function transformer(p: PixelPainter): void {
  // Cables up to the ceiling.
  p.rect(6, 0, 2, 8, 0x111316).rect(15, 0, 2, 8, 0x111316).rect(24, 0, 2, 8, 0x111316);
  p.rect(4, 6, 6, 3, 0x8a5a2b).rect(13, 6, 6, 3, 0x8a5a2b).rect(22, 6, 6, 3, 0x8a5a2b); // insulators
  p.rect(0, 9, 32, 31, 0x6b7280).rect(0, 9, 32, 2, 0x9aa0a8).rect(0, 38, 32, 2, 0x3a3f46);
  for (let x = 2; x < 30; x += 3) p.rect(x, 13, 2, 22, 0x5a616b).rect(x, 13, 1, 22, 0x8a8f99); // cooling fins
  // High-voltage sign.
  p.rect(10, 17, 12, 12, HAZARD).rect(10, 17, 12, 1, 0x111316).rect(10, 28, 12, 1, 0x111316);
  p.rect(16, 19, 2, 4, 0x111316).rect(14, 22, 4, 2, 0x111316).rect(14, 23, 2, 4, 0x111316);
}

// ------------------------------------------------------------------ workstations and door

/** Workstation (16×24): desk with a monitor showing graphs, and a chair. */
export function workstation(p: PixelPainter): void {
  p.rect(1, 4, 14, 10, 0x2a2e33).rect(2, 5, 12, 8, 0x0f2a3a);
  p.rect(3, 10, 2, 2, 0x6fe3ff).rect(6, 8, 2, 4, 0x6fe3ff).rect(9, 7, 2, 5, 0x76d17b).rect(12, 9, 1, 3, 0xf2c230);
  p.rect(7, 14, 2, 2, 0x2a2e33);
  p.rect(0, 16, 16, 3, 0x8a6b4a).rect(0, 16, 16, 1, 0xa8845e).rect(1, 19, 2, 5, 0x4a5058).rect(13, 19, 2, 5, 0x4a5058);
  p.rect(5, 17, 6, 1, 0x3a3f46); // keyboard
}

/** Exit door in the right-hand wall (16×32): steel door, push bar, green running-figure sign. */
export function exitDoor(p: PixelPainter): void {
  p.rect(2, 8, 12, 24, 0x8a919a).rect(2, 8, 12, 1, 0xb5bcc5).rect(13, 8, 1, 24, 0x6b7280);
  p.rect(3, 9, 10, 22, 0x9aa0a8).rect(4, 18, 8, 2, 0x4a5058).rect(5, 11, 6, 4, 0xc9e6ff);
  // Exit sign (no words): white running figure on green.
  p.rect(2, 0, 12, 7, 0x1e9e4a).rect(2, 0, 12, 1, 0x42c46e);
  const w = 0xffffff;
  p.px(9, 1, w).rect(7, 2, 2, 2, w).px(6, 3, w).px(9, 3, w).px(6, 4, w).px(9, 5, w).px(10, 4, w).px(5, 5, w).px(4, 2, w).px(4, 3, w);
}

// ------------------------------------------------------------------ fill-in equipment

/** Battery (UPS) cabinet (16×40): dark green cabinet with charge gauges. */
export function upsCabinet(p: PixelPainter): void {
  p.rect(0, 0, 16, 40, 0x2f4a3a).rect(0, 0, 16, 2, 0x4a6b56).rect(14, 0, 2, 40, 0x223529).rect(0, 38, 16, 2, 0x18241d);
  for (let y = 6; y < 34; y += 7) {
    // A battery symbol with a charge bar.
    p.rect(3, y, 9, 5, 0x18241d)
      .rect(12, y + 1, 1, 3, 0x18241d)
      .rect(4, y + 1, 7, 3, 0x3a3f46);
    p.rect(4, y + 1, 2 + ((y * 7) % 5), 3, 0x5cff8a);
  }
}
export const LEDS_UPS: [number, number][] = [
  [2, 3],
  [5, 3],
  [8, 3],
];

/** Storage shelf (16×40): metal shelving with spare drives and boxed parts. */
export function storageShelf(p: PixelPainter): void {
  p.rect(0, 0, 2, 40, 0x6b7280).rect(14, 0, 2, 40, 0x6b7280);
  for (const y of [2, 12, 22, 32]) {
    p.rect(0, y + 7, 16, 2, 0x8a919a);
    if (y < 30) {
      for (let x = 2; x < 14; x += 3) p.rect(x, y + 2, 2, 5, 0x2a2e33).px(x, y + 3, 0x5cff8a);
    }
  }
  p.rect(3, 33, 5, 6, 0xc2955a).rect(3, 33, 5, 1, 0xd9b07a).rect(9, 34, 4, 5, 0xa87a44);
}

/** Server cart (16×22): a rolling cart carrying a blade server. */
export function serverCart(p: PixelPainter): void {
  p.rect(1, 6, 14, 6, STEEL_DARK).rect(1, 6, 14, 1, STEEL_LIGHT);
  for (let x = 3; x < 13; x += 3) p.px(x, 9, 0x5cff8a);
  p.rect(0, 12, 16, 2, 0x8a919a).rect(1, 14, 1, 5, 0x6b7280).rect(14, 14, 1, 5, 0x6b7280).rect(0, 18, 16, 1, 0x8a919a);
  p.rect(14, 2, 1, 10, 0x6b7280).rect(12, 2, 3, 1, 0x6b7280);
  p.disc(2, 20, 1, 0x111316).disc(13, 20, 1, 0x111316);
}

/** Stacked hardware crates (16×18). */
export function crates(p: PixelPainter): void {
  const box = (x: number, y: number, w: number, h: number) => {
    p.rect(x, y, w, h, 0xc2955a)
      .rect(x, y, w, 1, 0xd9b07a)
      .rect(x + w - 1, y, 1, h, 0xa87a44);
    p.rect(x + Math.floor(w / 2) - 1, y, 2, h, 0xe0c48e, 0.7); // tape
  };
  box(1, 8, 8, 10);
  box(8, 10, 7, 8);
  box(3, 1, 8, 7);
  p.rect(4, 12, 3, 1, 0x3a2412).px(5, 11, 0x3a2412); // "this way up" arrows
}

/** Fire extinguisher on a wall bracket (16×22). */
export function extinguisher(p: PixelPainter): void {
  p.rect(4, 0, 8, 5, 0xd62828).rect(5, 1, 6, 3, 0xffffff).rect(7, 1, 2, 3, 0xd62828); // sign
  p.rect(5, 8, 6, 12, 0xd62828).rect(5, 8, 2, 12, 0xff5a5a).rect(6, 6, 4, 2, 0x3a3f46).rect(9, 5, 3, 1, 0x3a3f46);
  p.rect(5, 12, 6, 2, 0xeeeeee).rect(4, 20, 8, 2, 0x3a3f46);
}
