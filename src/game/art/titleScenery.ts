import Phaser from 'phaser';
import { PixelPainter, makeTexture } from './pixel';
import { C } from './palette';
import { dataCenter, townHall } from './buildings';
import { bush, oak, pine, tuft } from './props';

export { C };

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

// ------------------------------------------------------------- sprites

/** Reusable textures for things placed or animated individually. */
export function makeSceneryTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'tree-pine', 22, 42, pine, ART_PX);

  makeTexture(scene, 'tree-oak', 30, 36, oak, ART_PX);

  makeTexture(scene, 'bush', 20, 11, bush, ART_PX);

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
