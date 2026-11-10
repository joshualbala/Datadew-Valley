import type Phaser from 'phaser';
import type { PixelPainter } from '../pixel';
import { C } from '../palette';

/** Every slide picture fills this many screen pixels. */
export const PICTURE_W = 840;
export const PICTURE_H = 360;

/** Default zoom: 2 screen pixels per art pixel, so the art grid is 420×180. */
export const DEFAULT_SCALE = 2;
export const IW = PICTURE_W / DEFAULT_SCALE;
export const IH = PICTURE_H / DEFAULT_SCALE;

/** Size of an art grid (the picture's coordinate space). */
export interface Area {
  w: number;
  h: number;
}
const FULL: Area = { w: IW, h: IH };

/**
 * What an illustration's `animate` gets from the scene showing it. Kept free
 * of Phaser imports so illustrations (and the tests that check them) don't
 * need a browser.
 */
export interface IllustrationStage {
  scene: Phaser.Scene;
  /**
   * Draw a small sprite once (cached by key) and place it with its top-left at
   * art coordinates (x, y) of the picture. Returns the image for tweening.
   */
  sprite(key: string, w: number, h: number, draw: (p: PixelPainter) => void, x: number, y: number): Phaser.GameObjects.Image;
  /** Art-grid distance → screen pixels (for tween targets). */
  px(artUnits: number): number;
  /** Art-grid x / y inside the picture → screen position. */
  x(artX: number): number;
  y(artY: number): number;
  /** Run `fn` every `ms` milliseconds while the slide is showing. */
  every(ms: number, fn: () => void): void;
}

/**
 * A picture for a slide. `paint` draws everything that stays still (baked into
 * one texture); `animate` adds the moving bits (waving, smoke, blinking lights).
 * `scale` zooms in: 3 means chunkier pixels and a 280×120 art grid (see gridOf).
 */
export interface Illustration {
  scale?: number;
  paint(p: PixelPainter): void;
  animate?(stage: IllustrationStage): void;
}

/** The art grid an illustration paints on. */
export function gridOf(illustration: Illustration): Area & { scale: number } {
  const scale = illustration.scale ?? DEFAULT_SCALE;
  return { w: PICTURE_W / scale, h: PICTURE_H / scale, scale };
}

/** Small seeded random generator so a picture looks the same every time. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    frac: next,
    between: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
}
export type Rng = ReturnType<typeof seeded>;

/** Random number for animations (not seeded). */
export const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Move a sprite left → right across the picture forever (starts where it is, then wraps). `ms` = one full crossing. */
export function driftAcross(stage: IllustrationStage, img: Phaser.GameObjects.Image, ms: number, area: Area = FULL): void {
  const start = stage.x(0) - img.displayWidth;
  const end = stage.x(area.w);
  const loop = () => {
    img.x = start;
    stage.scene.tweens.add({ targets: img, x: end, duration: ms, repeat: -1 });
  };
  stage.scene.tweens.add({ targets: img, x: end, duration: (ms * (end - img.x)) / (end - start), onComplete: loop });
}

// ---------------------------------------------------------------- landscape

/** Vertical sky gradient from `colors[0]` (top) down to `height`, with dithered seams. */
export function sky(p: PixelPainter, colors: readonly number[], height: number, area: Area = FULL): void {
  const band = Math.ceil(height / colors.length);
  colors.forEach((color, i) => {
    p.rect(0, i * band, area.w, band, color);
    const next = colors[i + 1];
    if (next) p.dither(0, i * band + band - 2, area.w, 2, next);
  });
}

/** A rolling ridge filled down to the bottom of the picture. */
export function hills(
  p: PixelPainter,
  baseY: number,
  amp: number,
  wavelength: number,
  phase: number,
  color: number,
  edge?: number,
  area: Area = FULL,
): void {
  for (let x = 0; x < area.w; x++) {
    const h = Math.round(baseY + amp * Math.sin(x / wavelength + phase) + (amp / 2) * Math.sin(x / (wavelength / 3) + phase * 2));
    p.rect(x, h, 1, area.h - h, color);
    if (edge !== undefined) p.px(x, h, edge);
  }
}

export interface GrassColors {
  base: number;
  dark: number;
  light: number;
  tuft: number;
}
export const GRASS: GrassColors = { base: C.meadow, dark: C.meadowDark, light: C.meadowLight, tuft: C.tuft };

/** Grass from `top` to the bottom, with speckles and tufts. */
export function meadow(p: PixelPainter, top: number, rng: Rng, colors: GrassColors = GRASS, area: Area = FULL): void {
  for (let x = 0; x < area.w; x++) p.rect(x, top + Math.round(2 * Math.sin(x / 17)), 1, area.h, colors.base);
  p.dither(0, top + 4, area.w, 2, colors.dark);
  const density = (area.w * (area.h - top)) / 40000;
  for (let i = 0; i < 1100 * density; i++) p.px(rng.between(0, area.w), rng.between(top + 3, area.h), rng.pick([colors.light, colors.dark]));
  for (let i = 0; i < 170 * density; i++) {
    const x = rng.between(0, area.w);
    const y = rng.between(top + 6, area.h - 1);
    p.px(x, y, colors.tuft).px(x - 1, y - 1, colors.tuft).px(x + 1, y - 1, colors.tuft).px(x, y - 2, colors.light);
  }
}

/** A bare, lumpy patch of dirt centered on (cx, cy). */
export function dirtPatch(p: PixelPainter, cx: number, cy: number, rx: number, ry: number, rng: Rng): void {
  const dirt = 0x8f7350;
  const dark = 0x755c3e;
  const light = 0xa88a62;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)) + rng.between(-2, 1);
    if (half <= 0) continue;
    p.rect(cx - half, cy + y, half * 2, 1, dirt);
    p.px(cx - half, cy + y, dark);
  }
  for (let i = 0; i < rx * ry * 0.4; i++) p.px(cx + rng.between(-rx + 2, rx - 2), cy + rng.between(-ry + 1, ry - 1), rng.pick([dark, light]));
}

/** Centerline of the river along the bottom of a default-size picture. */
export const riverY = (x: number) => 172 + Math.round(3 * Math.sin(x / 28) + 2 * Math.sin(x / 9));

export interface RiverColors {
  water: number;
  deep: number;
  light: number;
  sand: number;
  bank: number;
}
export const WATER: RiverColors = { water: C.river, deep: C.riverDeep, light: C.riverLight, sand: C.bankSand, bank: C.bankDark };

export interface RiverShape {
  /** Centerline y for each x. */
  line?: (x: number) => number;
  /** Half the water's width. */
  half?: number;
  area?: Area;
}

export function river(p: PixelPainter, rng: Rng, colors: RiverColors = WATER, shape: RiverShape = {}): void {
  const { line = riverY, half = 7, area = FULL } = shape;
  for (let x = 0; x < area.w; x++) {
    const cy = line(x);
    p.px(x, cy - half - 2, colors.bank).px(x, cy - half - 1, colors.sand);
    p.rect(x, cy - half, 1, half * 2, colors.water).rect(x, cy - 2, 1, 5, colors.deep);
    p.px(x, cy + half, colors.sand).rect(x, cy + half + 1, 1, area.h, colors.bank);
    if (x % 9 === 0) p.rect(x, cy - half + 2 + rng.between(0, 2), 3, 1, colors.light);
  }
  // Reeds.
  for (let x = 6; x < area.w; x += rng.between(14, 30)) {
    const y = line(x) - half - 2;
    for (let i = 0; i < 3; i++) p.rect(x + i * 2, y - 4 - i, 1, 5 + i, C.tuft);
    p.rect(x + 2, y - 7, 1, 2, C.trunk);
  }
}

/** Flowers dotted over the grass, skipping the river. */
export function flowers(p: PixelPainter, rng: Rng, top: number, count: number, line = riverY, area: Area = FULL): void {
  for (let i = 0; i < count; i++) {
    const x = rng.between(2, area.w - 2);
    const y = rng.between(top, area.h - 2);
    if (Math.abs(y - line(x)) < 12) continue;
    p.px(x, y, C.tuft).px(x, y - 1, rng.pick(C.flowers));
  }
}

/** Cut tree stump (7×5), drawn with its base at (x, y). */
export function stump(p: PixelPainter, x: number, y: number): void {
  p.rect(x, y - 4, 7, 4, C.trunk).rect(x + 5, y - 4, 2, 4, C.trunkDark);
  p.rect(x, y - 5, 7, 2, 0xd9b47a).px(x + 3, y - 4, 0xb8915a);
  p.px(x - 1, y - 1, C.trunkDark).px(x + 7, y - 1, C.trunkDark);
}

// ---------------------------------------------------------------- buildings

export const COTTAGE_W = 44;
/** Cottage door, relative to the cottage's left edge (for paths and gates). */
export const COTTAGE_DOOR_X = 18;

/** Wall and roof colors for a cottage (Alex's is the default). */
export interface CottageColors {
  roof: number;
  roofDark: number;
  wall: number;
  wallShade: number;
}
export const ALEX_COTTAGE: CottageColors = { roof: 0xc0473a, roofDark: 0x963328, wall: 0xf3e2bf, wallShade: 0xd9c49a };

/** A cottage: walls, gable roof, chimney, flower boxes. Alex's colors by default. (x = left edge, y = ground) */
export function cottage(p: PixelPainter, x: number, y: number, litWindows = false, colors: CottageColors = ALEX_COTTAGE): void {
  const w = COTTAGE_W;
  const top = y - 24;
  const { roof, roofDark, wall, wallShade } = colors;
  const glass = litWindows ? 0xffd66b : C.glass;
  // Chimney.
  p.rect(x + w - 12, top - 20, 6, 14, C.brick).rect(x + w - 13, top - 21, 8, 2, C.brickDark);
  // Walls with wooden planks.
  p.rect(x + 2, top, w - 4, 24, wall);
  for (let yy = top + 3; yy < y; yy += 4) p.rect(x + 2, yy, w - 4, 1, wallShade);
  p.rect(x + w - 4, top, 2, 24, wallShade);
  // Roof (gable) with overhang.
  for (let i = 0; i < 16; i++) {
    const half = Math.round(4 + i * 1.6);
    p.rect(x + w / 2 - half, top - 16 + i, half * 2, 1, i % 4 === 3 ? roofDark : roof);
  }
  p.rect(x - 2, top - 1, w + 4, 2, roofDark);
  // Round attic window.
  p.disc(x + w / 2, top - 6, 3, C.stone).disc(x + w / 2, top - 6, 2, glass);
  // Door.
  const dx = x + COTTAGE_DOOR_X;
  p.rect(dx, y - 15, 9, 15, C.doorDark).rect(dx + 1, y - 14, 7, 14, C.door).px(dx + 6, y - 7, C.gold);
  // Windows with flower boxes.
  for (const wx of [x + 6, x + 31]) {
    p.rect(wx - 1, top + 5, 9, 9, C.stone).rect(wx, top + 6, 7, 7, glass);
    p.rect(wx + 3, top + 6, 1, 7, C.stone).rect(wx, top + 9, 7, 1, C.stone);
    if (!litWindows) p.px(wx + 1, top + 7, C.glassHi);
    p.rect(wx - 1, top + 14, 9, 2, C.door);
    for (let i = 0; i < 4; i++) p.px(wx + i * 2, top + 13, C.flowers[i]);
  }
  // Step.
  p.rect(dx - 2, y, 13, 1, C.stoneShade);
}

const PICKET = 0xfaf3e3;
const PICKET_RAIL = 0xe8dcc0;
const PICKET_SHADE = 0xcfc2a3;

/** Wooden picket fence running left → right from x0 to x1, standing on y. Leave `gap` [from, to] open for a gate. */
export function picketFence(p: PixelPainter, x0: number, x1: number, y: number, gap?: [number, number]): void {
  const open = (x: number) => gap !== undefined && x >= gap[0] && x < gap[1];
  for (let x = x0; x < x1; x++) if (!open(x)) p.px(x, y - 5, PICKET_RAIL).px(x, y - 2, PICKET_RAIL);
  for (let x = x0; x <= x1; x += 4) {
    if (open(x) || open(x + 1)) continue;
    p.rect(x, y - 7, 2, 7, PICKET).px(x + 1, y - 7, PICKET_SHADE).px(x, y - 8, PICKET);
  }
}

/** A fence seen from the side, running "back" from (x, yFront) up to yBack. */
export function picketFenceSide(p: PixelPainter, x: number, yBack: number, yFront: number): void {
  for (let y = yBack; y <= yFront; y++) p.px(x, y - 5, PICKET_RAIL).px(x + 1, y - 2, PICKET_RAIL);
  for (let y = yBack; y <= yFront; y += 3) p.rect(x, y - 7, 2, 7, PICKET).px(x + 1, y - 7, PICKET_SHADE);
}

// ---------------------------------------------------------------- people

/** A standing person is 11×21 art pixels; waving/pointing sprites are wider so the arm can reach out. */
export const PERSON_W = 11;
export const PERSON_H = 21;
export const WAVE_W = 15;
export const POINT_W = 13;

export type HairStyle = 'short' | 'curly' | 'long' | 'bun' | 'ponytail';

export interface Look {
  hair: number;
  skin: number;
  shirt: number;
  /** Color of the pants or skirt. */
  pants: number;
  hairStyle?: HairStyle;
  bottom?: 'pants' | 'skirt';
}

/** Alex's look, kept the same in every picture (and later the game sprite). Gender-neutral on purpose. */
export const ALEX: Look = { hair: 0x1a1210, skin: 0x7b4a2a, shirt: 0x2e9e8f, pants: 0x3b5b92, hairStyle: 'curly' };

/**
 * Neighbors: a mix of women and men, skin tones, ages and hair styles.
 * Shirts are blues, greens, purples and reds so they never blend with skin.
 */
export const TOWNSFOLK: readonly Look[] = [
  { hair: 0x2b1d14, skin: 0x8d5524, shirt: 0x3a7bd5, pants: 0x4a3b6b, hairStyle: 'long', bottom: 'skirt' },
  { hair: 0xe8c872, skin: 0xffdbac, shirt: 0x3fa34d, pants: 0x5c4033, hairStyle: 'short' },
  { hair: 0x1a1a1a, skin: 0xf0c8a0, shirt: 0x8e5bc7, pants: 0x3d405b, hairStyle: 'bun', bottom: 'skirt' },
  { hair: 0xc8c8c8, skin: 0xf1c27d, shirt: 0x2c3e66, pants: 0x4a4e69, hairStyle: 'bun' },
  { hair: 0x141010, skin: 0x5a3825, shirt: 0xc0392b, pants: 0x264653, hairStyle: 'short' },
  { hair: 0xa0462a, skin: 0xffdbac, shirt: 0x2d6a4f, pants: 0x5c4033, hairStyle: 'ponytail' },
  { hair: 0x2b1d14, skin: 0xc68642, shirt: 0x5b5fc7, pants: 0x3d405b, hairStyle: 'short' },
  { hair: 0x141010, skin: 0x6b4226, shirt: 0xd2437f, pants: 0x2c3e66, hairStyle: 'long', bottom: 'skirt' },
  { hair: 0x9a9a9a, skin: 0xe0ac69, shirt: 0x4f6d8a, pants: 0x3a3a3a, hairStyle: 'short' },
  { hair: 0x3d2b1f, skin: 0xa86b3c, shirt: 0x9b2335, pants: 0x264653, hairStyle: 'ponytail' },
];

const darker = (c: number, f = 0.75) =>
  (Math.round(((c >> 16) & 0xff) * f) << 16) | (Math.round(((c >> 8) & 0xff) * f) << 8) | Math.round((c & 0xff) * f);

export type Pose = 'stand' | 'point' | 'wave-in' | 'wave-mid' | 'wave-out';
export type Mood = 'happy' | 'neutral' | 'worried' | 'upset';

/**
 * A person facing the viewer, drawn at their own (0, 0): PERSON_W×PERSON_H
 * (WAVE_W / POINT_W wide for those poses). Simple face: two dot eyes and a
 * tiny mouth. Cycle wave-in → wave-mid → wave-out → wave-mid to wave.
 *
 * Head 7×8 (rows 1–8), shoulders 11 wide (rows 9–14), legs rows 15–19, shoes row 20.
 */
export function person(p: PixelPainter, look: Look, pose: Pose = 'stand', mood: Mood = 'happy'): void {
  const { hair, skin, shirt, pants } = look;
  const style = look.hairStyle ?? 'short';
  const dark = skin < 0x900000;
  const eye = 0x120c0a;
  const mouth = dark ? 0x3a1812 : 0xa0524a;

  // Hair behind the head.
  if (style === 'long') p.rect(1, 2, 9, 9, hair);
  if (style === 'ponytail') p.rect(9, 2, 2, 4, hair).px(10, 6, hair);
  if (style === 'bun') p.rect(4, 0, 3, 1, hair);

  // Head.
  p.rect(2, 2, 7, 7, skin);
  if (style !== 'long') p.px(1, 5, skin).px(9, 5, skin); // ears
  p.rect(3, 1, 5, 1, hair).rect(2, 2, 7, 1, hair);
  if (style === 'curly') p.px(2, 3, hair).px(8, 3, hair);
  else if (style === 'short') p.rect(2, 3, 2, 1, hair).rect(7, 3, 2, 1, hair);
  else p.rect(2, 3, 3, 1, hair).px(8, 3, hair); // side part
  if (style === 'long') p.rect(2, 4, 1, 4, hair).rect(8, 4, 1, 4, hair);

  // Face: dot eyes and a tiny mouth.
  p.px(4, 5, eye).px(6, 5, eye);
  if (mood === 'happy') p.px(4, 7, mouth).px(5, 8, mouth).px(6, 7, mouth); // small smile
  else p.rect(4, 7, 3, 1, mouth); // neutral / worried / upset: a short flat line

  // Shoulders and body.
  p.rect(1, 9, 9, 6, shirt).rect(8, 9, 2, 6, darker(shirt));
  p.rect(0, 10, 1, 4, shirt).px(0, 14, skin); // left arm
  switch (pose) {
    case 'stand':
      p.rect(10, 10, 1, 4, darker(shirt)).px(10, 14, skin);
      break;
    case 'point':
      p.rect(10, 9, 2, 1, darker(shirt)).px(12, 9, skin);
      break;
    case 'wave-in':
      p.px(10, 9, shirt).rect(11, 6, 1, 3, skin).rect(11, 4, 2, 2, skin);
      break;
    case 'wave-mid':
      p.px(10, 9, shirt).px(11, 8, skin).rect(12, 6, 1, 2, skin).rect(12, 4, 2, 2, skin);
      break;
    case 'wave-out':
      p.px(10, 9, shirt).px(11, 8, skin).px(12, 7, skin).px(13, 6, skin).rect(13, 4, 2, 2, skin);
      break;
  }

  // Legs and shoes.
  if (look.bottom === 'skirt') {
    p.rect(1, 15, 9, 3, pants).rect(8, 15, 2, 3, darker(pants));
    p.rect(3, 18, 2, 2, skin).rect(6, 18, 2, 2, skin);
  } else {
    p.rect(2, 15, 7, 5, pants).rect(5, 16, 1, 4, darker(pants));
  }
  p.rect(2, 20, 3, 1, 0x3a2412).rect(6, 20, 3, 1, 0x3a2412);
}

/** Make `who` wave side to side: sprites cycled in place (in, mid, out, mid). Returns them for extra tweens. */
export function wavingPerson(stage: IllustrationStage, key: string, who: Look, x: number, y: number, mood: Mood = 'happy') {
  const poses: Pose[] = ['wave-in', 'wave-mid', 'wave-out'];
  const frames = poses.map((pose) => stage.sprite(`${key}-${pose}-${mood}`, WAVE_W, PERSON_H, (p) => person(p, who, pose, mood), x, y));
  const order = [0, 1, 2, 1];
  let step = 0;
  const show = () => frames.forEach((f, i) => f.setVisible(i === order[step % order.length]));
  show();
  stage.every(170, () => {
    step += 1;
    show();
  });
  return frames;
}
