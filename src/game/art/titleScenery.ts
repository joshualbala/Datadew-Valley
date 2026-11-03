import Phaser from 'phaser';
import { PixelPainter, makeTexture } from './pixel';

/**
 * Placeholder pixel art for the opening page, drawn in code on a 2px grid
 * (art grid 480×270). Real sprite art can replace this in Step 13.
 */
export const ART_PX = 2;
export const AW = 480;
export const AH = 270;
export const GROUND_Y = 206; // where buildings stand
export const RIVER_Y = 245; // river centerline

export const TOWN_HALL_X = 16;
export const DATA_CENTER_X = 344;

/** Bright "before the data center" palette. */
export const C = {
  sky: [0x5fb8ec, 0x6cc0ef, 0x7ac8f1, 0x89cff3, 0x98d6f5, 0xa7ddf7, 0xb6e4f9, 0xc4eafa, 0xd2f0fb, 0xdff5fc],
  sun: 0xffe27a,
  sunCore: 0xfff2b0,
  sunGlow: 0xfff6cf,
  cloud: 0xffffff,
  cloudShade: 0xdcebf5,
  mountain: 0x9fb8dc,
  mountainShade: 0x8aa3cc,
  snow: 0xf4f8ff,
  hillFar: 0x9ed47a,
  hillFarShade: 0x8cc66a,
  farTrees: 0x6aab58,
  hillNear: 0x6dbd4c,
  hillNearLight: 0x84cc5c,
  meadow: 0x79c94f,
  meadowDark: 0x67b843,
  meadowLight: 0x96dc68,
  tuft: 0x56a63a,
  river: 0x3d9be0,
  riverDeep: 0x2f86cc,
  riverLight: 0xa8e0ff,
  bankSand: 0xe2c98f,
  bankDark: 0x4f9a3a,
  lily: 0x4caf50,
  rock: 0x9a9a8f,
  rockLight: 0xbdbdb2,
  trunk: 0x7a4a24,
  trunkDark: 0x5a3418,
  pine: 0x2f7d3a,
  pineDark: 0x24642e,
  pineLight: 0x4aa452,
  leaf: 0x3f9a3f,
  leafDark: 0x2f7f33,
  leafLight: 0x6cc35a,
  leafHi: 0x9be07a,
  flowers: [0xff8fc7, 0xffe14d, 0xffffff, 0xb48cff, 0xff6b6b],
  brick: 0xb5523b,
  brickDark: 0x9a4430,
  brickRecess: 0x7e3626,
  stone: 0xf3ead8,
  stoneShade: 0xd6c9ad,
  stoneDark: 0xb3a587,
  slate: 0x4f6d8a,
  slateLight: 0x6a88a6,
  copper: 0x5fb3a1,
  copperLight: 0x86d1bf,
  copperDark: 0x3f8b7b,
  gold: 0xf2c14e,
  door: 0x6b3f1d,
  doorDark: 0x4e2c13,
  glass: 0x9fd8f5,
  glassHi: 0xe6f7ff,
  ironDark: 0x3a3a3a,
  lamp: 0xffe9a0,
  dcWall: 0xd3d8df,
  dcPanel: 0xbcc2cb,
  dcDark: 0x8e96a2,
  dcDarker: 0x6b7380,
  dcRoof: 0xa5acb7,
  dcGlass: 0x7fc4e8,
  dcBlue: 0x2d6fd6,
  fence: 0x7a808a,
  fenceMesh: 0xaab0b9,
  hazard: 0xf2c14e,
  white: 0xffffff,
  cream: 0xfff4d6,
};

/** Paint the static parts of the scene into one texture (drawn once, cheap to render). */
export function paintBackground(scene: Phaser.Scene, key = 'title-bg'): string {
  return makeTexture(scene, key, AW, AH, (p) => {
    const rng = new Phaser.Math.RandomDataGenerator(['datadew-valley']);
    sky(p);
    sun(p, 432, 38);
    mountains(p);
    farHills(p, rng);
    nearHills(p, rng);
    meadow(p, rng);
    river(p, rng);
    townHall(p, TOWN_HALL_X, GROUND_Y);
    dataCenter(p, DATA_CENTER_X, GROUND_Y);
    foreground(p, rng);
  }, ART_PX);
}

// ------------------------------------------------------------------ layers

function sky(p: PixelPainter): void {
  const bandH = 15;
  C.sky.forEach((color, i) => {
    p.rect(0, i * bandH, AW, bandH, color);
    // Dithered seam into the next band for a smooth pixel gradient.
    const next = C.sky[i + 1];
    if (next) p.dither(0, i * bandH + bandH - 3, AW, 3, next);
  });
  p.rect(0, C.sky.length * bandH, AW, AH, C.sky[C.sky.length - 1]);
}

function sun(p: PixelPainter, x: number, y: number): void {
  p.disc(x, y, 22, C.sunGlow, 0.35).disc(x, y, 17, C.sunGlow, 0.6).disc(x, y, 13, C.sun).disc(x - 3, y - 3, 7, C.sunCore);
}

function mountains(p: PixelPainter): void {
  // Each peak is a cone; the skyline is whichever cone is highest at each column.
  const peaks: [number, number][] = [[20, 92], [96, 100], [176, 86], [262, 102], [338, 90], [430, 96], [500, 104]];
  const slope = 0.6;
  for (let x = 0; x < AW; x++) {
    let best = { y: 999, px: 0, py: 0 };
    for (const [px, py] of peaks) {
      const y = py + Math.abs(x - px) * slope + (x % 7 === 0 ? 1 : 0);
      if (y < best.y) best = { y, px, py };
    }
    const h = Math.round(best.y);
    if (h >= 160) continue;
    // Lit left faces, shaded right faces.
    p.rect(x, h, 1, 160 - h, x > best.px ? C.mountainShade : C.mountain);
    // Snow caps on the higher peaks, with a ragged lower edge.
    const capDepth = 10 - (best.py - 86) - (x % 3);
    if (best.py < 100 && h - best.py < capDepth) p.rect(x, h, 1, Math.max(1, capDepth - (h - best.py)), C.snow);
  }
}

function farHills(p: PixelPainter, rng: Phaser.Math.RandomDataGenerator): void {
  for (let x = 0; x < AW; x++) {
    const h = 140 + Math.round(7 * Math.sin(x / 34) + 4 * Math.sin(x / 13 + 1));
    p.rect(x, h, 1, AH - h, C.hillFar);
    p.dither(x, h + 6, 1, 4, C.hillFarShade);
    // A line of small distant trees along the ridge.
    if (x % 5 === 0 && rng.frac() < 0.7) {
      const th = rng.between(4, 8);
      for (let i = 0; i < th; i++) p.rect(x - Math.floor(i / 3), h - th + i, 1 + Math.floor(i / 3) * 2, 1, C.farTrees);
    }
  }
}

function nearHills(p: PixelPainter, rng: Phaser.Math.RandomDataGenerator): void {
  for (let x = 0; x < AW; x++) {
    const h = 160 + Math.round(6 * Math.sin(x / 26 + 2) + 3 * Math.sin(x / 9));
    p.rect(x, h, 1, AH - h, C.hillNear);
    p.px(x, h, C.hillNearLight);
    if (rng.frac() < 0.3) p.px(x, h + 1, C.hillNearLight);
  }
}

function meadow(p: PixelPainter, rng: Phaser.Math.RandomDataGenerator): void {
  const top = 176;
  for (let x = 0; x < AW; x++) {
    const h = top + Math.round(2 * Math.sin(x / 15));
    p.rect(x, h, 1, AH - h, C.meadow);
  }
  p.dither(0, top + 4, AW, 2, C.meadowDark);
  // Grass speckles and tufts.
  for (let i = 0; i < 900; i++) p.px(rng.between(0, AW), rng.between(top + 2, AH), rng.pick([C.meadowLight, C.meadowDark]));
  for (let i = 0; i < 160; i++) tuft(p, rng.between(0, AW), rng.between(top + 6, AH - 2));
}

export function tuft(p: PixelPainter, x: number, y: number): void {
  p.px(x, y, C.tuft).px(x - 1, y - 1, C.tuft).px(x + 1, y - 1, C.tuft).px(x, y - 2, C.meadowLight);
}

function river(p: PixelPainter, rng: Phaser.Math.RandomDataGenerator): void {
  for (let x = 0; x < AW; x++) {
    const cy = riverCenter(x);
    const half = 8;
    p.rect(x, cy - half - 2, 1, 1, C.bankDark);
    p.rect(x, cy - half - 1, 1, 1, C.bankSand);
    p.rect(x, cy - half, 1, half * 2, C.river);
    p.rect(x, cy - 3, 1, 6, C.riverDeep);
    p.rect(x, cy + half, 1, 1, C.bankSand);
    p.rect(x, cy + half + 1, 1, 1, C.bankDark);
    if (x % 9 === 0) p.rect(x, cy - 6 + rng.between(0, 2), 3, 1, C.riverLight);
    if (x % 13 === 4) p.rect(x, cy + 3 + rng.between(0, 2), 2, 1, C.riverLight);
  }
  // Lily pads with a flower or two.
  for (const lx of [70, 210, 290, 400]) {
    const ly = riverCenter(lx) + 2;
    p.disc(lx, ly, 2, C.lily).px(lx + 1, ly - 1, C.meadowLight);
    if (lx % 140 === 70) p.px(lx, ly - 1, C.flowers[0]);
  }
  // Rocks along the bank.
  for (const rx of [30, 160, 255, 372, 458]) {
    const ry = riverCenter(rx) - 10;
    p.rect(rx, ry, 5, 3, C.rock).rect(rx + 1, ry, 2, 1, C.rockLight);
  }
}

export function riverCenter(x: number): number {
  return RIVER_Y + Math.round(4 * Math.sin(x / 30) + 2 * Math.sin(x / 11));
}

function foreground(p: PixelPainter, rng: Phaser.Math.RandomDataGenerator): void {
  // Flowers on stems across the meadow (not on the river).
  for (let i = 0; i < 140; i++) {
    const x = rng.between(2, AW - 2);
    const y = rng.between(GROUND_Y + 6, AH - 2);
    if (Math.abs(y - riverCenter(x)) < 13) continue;
    p.px(x, y, C.tuft).px(x, y - 1, rng.pick(C.flowers));
  }
  // Reeds at the river's edge.
  for (let x = 4; x < AW; x += rng.between(10, 26)) {
    const y = riverCenter(x) - 10;
    for (let i = 0; i < 3; i++) p.rect(x + i * 2, y - 4 - i, 1, 5 + i, C.tuft);
    p.rect(x + 2, y - 7, 1, 2, C.trunk);
  }
}

// --------------------------------------------------------------- town hall

/** Brick town hall with white columns, a pediment and a clock tower. (x = left edge, y = ground) */
function townHall(p: PixelPainter, x: number, y: number): void {
  const w = 120;
  const cx = x + w / 2;
  const top = y - 44; // top of main walls

  // Clock tower (behind the pediment).
  p.rect(cx - 11, top - 40, 22, 42, C.stoneShade).rect(cx - 10, top - 40, 19, 42, C.stone);
  p.rect(cx - 12, top - 41, 24, 2, C.stoneDark);
  p.disc(cx, top - 26, 7, C.stoneDark).disc(cx, top - 26, 6, C.white);
  p.rect(cx, top - 31, 1, 5, C.ironDark).rect(cx, top - 26, 4, 1, C.ironDark);
  for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) p.px(cx + dx, top - 26 + dy, C.ironDark);
  // Belfry with bell.
  p.rect(cx - 9, top - 56, 18, 15, C.stone).rect(cx - 9, top - 56, 1, 15, C.stoneShade);
  p.rect(cx - 5, top - 53, 10, 10, C.brickRecess).halfDisc(cx, top - 53, 5, C.brickRecess);
  p.rect(cx - 2, top - 51, 4, 4, C.gold).rect(cx - 3, top - 47, 6, 1, C.gold);
  p.rect(cx - 10, top - 57, 20, 2, C.stoneDark);
  // Copper dome + spire.
  p.halfDisc(cx, top - 58, 9, C.copper).halfDisc(cx - 2, top - 60, 4, C.copperLight);
  p.rect(cx - 9, top - 58, 18, 1, C.copperDark);
  p.rect(cx - 1, top - 74, 2, 8, C.copperDark).px(cx, top - 76, C.gold);
  // Flagpole (flag itself is animated in the scene).
  p.rect(cx + 6, top - 84, 1, 22, C.ironDark);

  // Wing roofs (slate, hipped).
  for (let i = 0; i < 8; i++) {
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
function dataCenter(p: PixelPainter, x: number, y: number): void {
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

// ------------------------------------------------------------- sprites

/** Reusable textures for things placed or animated individually. */
export function makeSceneryTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'tree-pine', 22, 42, (p) => {
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
  }, ART_PX);

  makeTexture(scene, 'tree-oak', 30, 36, (p) => {
    p.rect(13, 22, 5, 14, C.trunk).rect(16, 22, 2, 14, C.trunkDark).rect(11, 34, 9, 2, C.trunk);
    p.disc(15, 15, 13, C.leafDark);
    p.disc(9, 13, 8, C.leaf).disc(20, 12, 8, C.leaf).disc(15, 8, 8, C.leaf).disc(14, 18, 8, C.leaf);
    p.disc(11, 8, 4, C.leafLight).disc(18, 6, 3, C.leafLight).disc(7, 13, 3, C.leafLight);
    p.px(10, 6, C.leafHi).px(17, 4, C.leafHi).px(6, 11, C.leafHi);
    p.dither(4, 20, 22, 4, C.leafDark);
    // A couple of apples for charm.
    p.px(8, 17, 0xe0483e).px(21, 16, 0xe0483e).px(15, 21, 0xe0483e);
  }, ART_PX);

  makeTexture(scene, 'bush', 20, 11, (p) => {
    p.disc(6, 7, 5, C.leafDark).disc(13, 6, 6, C.leafDark).disc(6, 6, 4, C.leaf).disc(13, 5, 5, C.leaf);
    p.px(5, 3, C.leafLight).px(12, 1, C.leafLight).px(15, 3, C.leafLight).px(9, 6, C.flowers[0]).px(16, 7, C.flowers[1]);
  }, ART_PX);

  makeTexture(scene, 'cloud-big', 48, 16, (p) => {
    p.disc(12, 10, 6, C.cloud).disc(22, 7, 7, C.cloud).disc(32, 9, 6, C.cloud).disc(40, 11, 4, C.cloud);
    p.rect(6, 11, 38, 5, C.cloud).rect(7, 14, 36, 2, C.cloudShade);
  }, ART_PX);
  makeTexture(scene, 'cloud-small', 28, 11, (p) => {
    p.disc(8, 7, 4, C.cloud).disc(15, 5, 5, C.cloud).disc(21, 7, 4, C.cloud);
    p.rect(4, 7, 21, 4, C.cloud).rect(5, 9, 19, 2, C.cloudShade);
  }, ART_PX);

  // Two-frame bird.
  makeTexture(scene, 'bird-0', 7, 3, (p) => p.px(0, 0, 0x3a3a4a).px(1, 1, 0x3a3a4a).px(2, 2, 0x3a3a4a).px(3, 1, 0x3a3a4a).px(4, 0, 0x3a3a4a).px(5, 0, 0x3a3a4a).px(6, 0, 0x3a3a4a), ART_PX);
  makeTexture(scene, 'bird-1', 7, 3, (p) => p.px(0, 2, 0x3a3a4a).px(1, 1, 0x3a3a4a).px(2, 1, 0x3a3a4a).px(3, 2, 0x3a3a4a).px(4, 1, 0x3a3a4a).px(5, 1, 0x3a3a4a).px(6, 2, 0x3a3a4a), ART_PX);

  // Two-frame flag.
  makeTexture(scene, 'flag-0', 10, 7, (p) => {
    p.rect(0, 0, 9, 6, 0x2e86de).rect(0, 0, 9, 2, 0xffffff).rect(0, 4, 9, 2, 0x27ae60).px(9, 1, 0x2e86de);
  }, ART_PX);
  makeTexture(scene, 'flag-1', 10, 7, (p) => {
    for (let x = 0; x < 9; x++) {
      const dy = x % 4 < 2 ? 0 : 1;
      p.rect(x, dy, 1, 2, 0xffffff).rect(x, dy + 2, 1, 2, 0x2e86de).rect(x, dy + 4, 1, 2, 0x27ae60);
    }
  }, ART_PX);

  // Rooftop fan blades (rotated by the scene).
  makeTexture(scene, 'fan', 7, 7, (p) => {
    p.rect(3, 0, 1, 7, C.dcPanel).rect(0, 3, 7, 1, C.dcPanel).px(1, 1, C.dcDark).px(5, 5, C.dcDark).px(5, 1, C.dcDark).px(1, 5, C.dcDark).px(3, 3, C.dcDarker);
  }, ART_PX);

  makeTexture(scene, 'led', 2, 1, (p) => p.rect(0, 0, 2, 1, 0xffffff), ART_PX);
  makeTexture(scene, 'puff', 6, 6, (p) => p.disc(3, 3, 2, 0xffffff).px(2, 2, 0xffffff), ART_PX);
  makeTexture(scene, 'sparkle', 3, 3, (p) => p.px(1, 0, 0xffffff).px(0, 1, 0xffffff).px(1, 1, 0xffffff).px(2, 1, 0xffffff).px(1, 2, 0xffffff), ART_PX);
  makeTexture(scene, 'butterfly-0', 5, 3, (p) => p.rect(0, 0, 2, 2, 0xff9ad5).rect(3, 0, 2, 2, 0xff9ad5).px(2, 1, 0x3a2a1a).px(2, 2, 0x3a2a1a), ART_PX);
  makeTexture(scene, 'butterfly-1', 5, 3, (p) => p.rect(1, 1, 1, 1, 0xff9ad5).rect(3, 1, 1, 1, 0xff9ad5).px(2, 0, 0x3a2a1a).px(2, 1, 0x3a2a1a).px(2, 2, 0x3a2a1a), ART_PX);
}
