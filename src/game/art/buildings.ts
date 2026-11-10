import type { PixelPainter } from './pixel';
import { C } from './palette';

/** Buildings shared by the title screen and the intro illustrations. Pure drawing: no Phaser needed. */

// --------------------------------------------------------------- town hall

/**
 * Brick town hall with white columns, a pediment and a clock tower. (x = left edge, y = ground; 120 wide)
 * Options: `flagpole`, `wingRoofs` (gray slate roofs on the wings) and `belfry`
 * (the bell section of the tower; without it the hall is 104 tall instead of 120).
 */
export function townHall(
  p: PixelPainter,
  x: number,
  y: number,
  { flagpole = true, wingRoofs = true, belfry = true } = {},
): void {
  const w = 120;
  const cx = x + w / 2;
  const top = y - 44; // top of main walls
  const lift = belfry ? 0 : 16; // dome and spire sit lower without the belfry

  // Clock tower (behind the pediment).
  p.rect(cx - 11, top - 40, 22, 42, C.stoneShade).rect(cx - 10, top - 40, 19, 42, C.stone);
  p.rect(cx - 12, top - 41, 24, 2, C.stoneDark);
  p.disc(cx, top - 26, 7, C.stoneDark).disc(cx, top - 26, 6, C.white);
  p.rect(cx, top - 31, 1, 5, C.ironDark).rect(cx, top - 26, 4, 1, C.ironDark);
  for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) p.px(cx + dx, top - 26 + dy, C.ironDark);
  if (belfry) {
    p.rect(cx - 9, top - 56, 18, 15, C.stone).rect(cx - 9, top - 56, 1, 15, C.stoneShade);
    p.rect(cx - 5, top - 53, 10, 10, C.brickRecess).halfDisc(cx, top - 53, 5, C.brickRecess);
    p.rect(cx - 2, top - 51, 4, 4, C.gold).rect(cx - 3, top - 47, 6, 1, C.gold);
    p.rect(cx - 10, top - 57, 20, 2, C.stoneDark);
  }
  // Copper dome + spire.
  const d = top + lift;
  p.halfDisc(cx, d - 58, 9, C.copper).halfDisc(cx - 2, d - 60, 4, C.copperLight);
  p.rect(cx - 9, d - 58, 18, 1, C.copperDark);
  p.rect(cx - 1, d - 74, 2, 8, C.copperDark).px(cx, d - 76, C.gold);
  // Flagpole (flag itself is animated in the scene).
  if (flagpole) p.rect(cx + 6, d - 84, 1, 22, C.ironDark);

  // Wing roofs (slate, hipped).
  for (let i = 0; wingRoofs && i < 8; i++) {
    const c = i === 0 ? C.slateLight : C.slate;
    p.rect(x + i, top - 8 + i, w / 2 - 22 - i, 1, c);
    p.rect(cx + 22, top - 8 + i, w / 2 - 22 - i, 1, c);
  }

  // Brick walls with mortar lines.
  p.rect(x, top, w, 44, C.brick);
  for (let row = 0; row < 44; row += 4) {
    p.rect(x, top + row, w, 1, C.brickDark);
    for (let col = (row / 4) % 2 ? 0 : 4; col < w; col += 8) p.px(x + col, top + row + 1, C.brickDark).px(x + col, top + row + 2, C.brickDark);
  }
  // Cornice and plinth.
  p.rect(x - 2, top - 2, w + 4, 3, C.stone).rect(x - 2, top + 1, w + 4, 1, C.stoneDark);
  p.rect(x - 1, y - 5, w + 2, 5, C.stoneShade).rect(x - 1, y - 5, w + 2, 1, C.stone);

  // Wing windows: arched, with white frames and sills.
  for (const wx of [x + 8, x + 24, x + w - 32, x + w - 16]) {
    p.rect(wx - 1, top + 10, 10, 18, C.stone).halfDisc(wx + 4, top + 10, 5, C.stone);
    p.rect(wx, top + 11, 8, 16, C.glass).halfDisc(wx + 4, top + 11, 4, C.glass);
    p.rect(wx + 4, top + 8, 1, 19, C.stone).rect(wx, top + 18, 8, 1, C.stone);
    p.px(wx + 1, top + 12, C.glassHi).px(wx + 2, top + 13, C.glassHi).px(wx + 5, top + 20, C.glassHi);
    p.rect(wx - 2, top + 28, 12, 2, C.stoneDark);
    // Flower box.
    p.rect(wx - 1, top + 30, 10, 2, C.door);
    for (let i = 0; i < 5; i++) p.px(wx + i * 2, top + 29, C.flowers[i % C.flowers.length]);
  }

  // Portico: recessed entrance, columns, pediment.
  const px0 = cx - 24;
  p.rect(px0, top + 2, 48, 37, C.brickRecess);
  // Door (arched, double).
  p.rect(cx - 6, top + 18, 12, 21, C.doorDark).halfDisc(cx, top + 18, 6, C.doorDark);
  p.rect(cx - 5, top + 18, 10, 21, C.door).halfDisc(cx, top + 18, 5, C.door);
  p.rect(cx, top + 14, 1, 25, C.doorDark);
  p.rect(cx - 4, top + 22, 3, 6, C.doorDark).rect(cx + 2, top + 22, 3, 6, C.doorDark);
  p.rect(cx - 4, top + 30, 3, 6, C.doorDark).rect(cx + 2, top + 30, 3, 6, C.doorDark);
  p.px(cx - 2, top + 28, C.gold).px(cx + 2, top + 28, C.gold);
  // Columns.
  for (let i = 0; i < 5; i++) {
    const colX = px0 + 1 + i * 10;
    if (i === 2) continue; // leave the door visible
    p.rect(colX - 1, top + 2, 7, 2, C.stoneDark); // capital
    p.rect(colX, top + 4, 5, 33, C.stone).rect(colX + 4, top + 4, 1, 33, C.stoneShade).rect(colX + 2, top + 4, 1, 33, C.stoneShade);
    p.rect(colX - 1, top + 37, 7, 2, C.stoneDark); // base
  }
  // Pediment (triangle).
  for (let i = 0; i < 14; i++) {
    const half = 30 - Math.round(i * 2.1);
    p.rect(cx - half, top - 1 - i, half * 2, 1, i === 0 ? C.stoneDark : C.stone);
    p.px(cx - half, top - 1 - i, C.stoneDark).px(cx + half - 1, top - 1 - i, C.stoneDark);
  }
  p.disc(cx, top - 6, 3, C.gold).disc(cx, top - 6, 1, C.stone);

  // Steps.
  for (let i = 0; i < 3; i++) {
    p.rect(cx - 16 - i * 3, y - 1 + i * 2, 32 + i * 6, 2, i % 2 ? C.stoneShade : C.stone);
  }

  // Lamp posts beside the steps.
  for (const lx of [cx - 30, cx + 29]) {
    p.rect(lx, y - 18, 1, 20, C.ironDark).rect(lx - 2, y - 22, 5, 4, C.ironDark).rect(lx - 1, y - 21, 3, 2, C.lamp);
  }
  // Hedges along the front.
  for (const hx of [x + 4, x + 20, x + w - 34, x + w - 18]) {
    p.disc(hx + 5, y, 5, C.leafDark).disc(hx + 5, y - 1, 4, C.leaf).px(hx + 3, y - 3, C.leafLight).px(hx + 6, y - 4, C.leafLight);
  }
}

// ------------------------------------------------------------- data center

/** Large windowless data center behind a fence, with rooftop fans and exhaust stacks. */
export function dataCenter(p: PixelPainter, x: number, y: number): void {
  const w = 128;
  const h = 46;
  const top = y - h;

  // Exhaust stacks (behind roofline, right side).
  for (const sx of [x + w - 26, x + w - 14]) {
    p.rect(sx, top - 30, 8, 32, C.dcPanel).rect(sx, top - 30, 2, 32, C.white).rect(sx + 6, top - 30, 2, 32, C.dcDark);
    p.rect(sx, top - 26, 8, 2, 0xd9534f).rect(sx, top - 20, 8, 2, 0xd9534f);
    p.rect(sx - 1, top - 31, 10, 2, C.dcDarker);
  }

  // Rooftop HVAC units (fans are animated sprites placed on top).
  for (let i = 0; i < 4; i++) {
    const ux = x + 6 + i * 22;
    p.rect(ux, top - 9, 18, 10, C.dcRoof).rect(ux, top - 9, 18, 2, C.dcPanel).rect(ux + 17, top - 9, 1, 10, C.dcDark);
    p.disc(ux + 9, top - 4, 4, C.dcDarker);
  }

  // Main hall.
  p.rect(x, top, w, h, C.dcWall);
  for (let px = x + 8; px < x + w; px += 10) p.rect(px, top + 4, 1, h - 4, C.dcPanel);
  p.rect(x, top, w, 4, C.dcDark).rect(x, top + 3, w, 1, C.dcDarker);
  p.rect(x + w - 3, top, 3, h, C.dcPanel); // shaded corner
  // Louvre band.
  for (let ly = top + 9; ly < top + 17; ly += 2) p.rect(x + 4, ly, w - 8, 1, C.dcDarker);
  p.rect(x + 4, top + 8, w - 8, 1, C.dcDark).rect(x + 4, top + 17, w - 8, 1, C.dcDark);

  // Entrance with canopy and glass doors.
  const ex = x + 12;
  p.rect(ex - 3, top + 22, 28, 3, C.dcDarker);
  p.rect(ex, top + 25, 22, h - 25, C.dcDarker).rect(ex + 1, top + 26, 9, h - 26, C.dcGlass).rect(ex + 12, top + 26, 9, h - 26, C.dcGlass);
  p.px(ex + 2, top + 27, C.glassHi).px(ex + 3, top + 28, C.glassHi).px(ex + 13, top + 27, C.glassHi).px(ex + 14, top + 28, C.glassHi);

  // Logo panel: blue square with a little white cloud.
  const lx = x + 46;
  p.rect(lx, top + 24, 18, 12, C.dcBlue).frame(lx, top + 24, 18, 12, 0x1f54a8);
  p.disc(lx + 7, top + 31, 2, C.white).disc(lx + 10, top + 30, 3, C.white).rect(lx + 5, top + 31, 9, 2, C.white);

  // Server status strip (LEDs are animated sprites).
  p.rect(x + 76, top + 26, 44, 8, C.dcDarker);

  // Transformer box with hazard stripes (right side).
  const tx = x + w - 20;
  p.rect(tx, y - 10, 16, 10, C.dcDark).rect(tx, y - 10, 16, 2, C.dcPanel);
  for (let i = 0; i < 16; i += 4) p.rect(tx + i, y - 4, 2, 2, C.hazard);

  // Security fence in front.
  const fx0 = x - 8;
  const fx1 = x + w + 6;
  const fTop = y - 10;
  for (let fy = fTop + 1; fy < y + 4; fy++) {
    for (let fx = fx0; fx < fx1; fx++) if ((fx + fy) % 4 === 0 || (fx - fy) % 4 === 0) p.px(fx, fy, C.fenceMesh, 0.8);
  }
  p.rect(fx0, fTop, fx1 - fx0, 1, C.fence);
  for (let fx = fx0; fx <= fx1; fx += 12) p.rect(fx, fTop - 3, 2, 17, C.fence);
  // Barbed wire.
  for (let fx = fx0; fx < fx1; fx++) p.px(fx, fTop - 3 + (fx % 4 < 2 ? 0 : 1), C.dcDarker);
  // Gate.
  p.rect(x + 8, fTop, 2, 14, C.fence).rect(x + 26, fTop, 2, 14, C.fence);
}
