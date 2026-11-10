import { dataCenter, townHall } from '../art/buildings';
import { cottage, type Rng } from '../art/illustrations/common';
import { C } from '../art/palette';
import type { PixelPainter } from '../art/pixel';
import { bush, oak, pine } from '../art/props';
import {
  bench,
  car,
  gableHouse,
  hydrant,
  mailbox,
  modernHouse,
  shop,
  stopSign,
  streetLamp,
  streetSign,
  tallHouse,
  trashCan,
} from '../art/town';

/**
 * Top-down map tiles, drawn in code. A map file (public/content/maps/*.json)
 * is a grid of letters; its "legend" maps each letter to one of the kinds
 * below. Kept free of Phaser so the tests can check maps and paint tiles.
 *
 * To add a kind: add an entry to `kinds` (ground it stands on, whether Alex can
 * walk on it, and optionally an object sprite), then use it in a legend.
 */

/** Tiles are 16×16 art pixels (48×48 on screen at MAP_SCALE 3). */
export const TILE = 16;
export const MAP_SCALE = 3;

/** Look up the kind at an offset from the current tile ('' outside the map). */
export type Neighbors = (dx: number, dy: number) => string;

export interface Sprite {
  /** Texture size in art pixels. */
  w: number;
  h: number;
  draw: (p: PixelPainter) => void;
  /** How far the sprite's bottom edge sits below the footprint's bottom edge (art px). Default 0. */
  sink?: number;
  /** Texture cache key suffix when the drawing varies (fence joins, house colors). */
  variant?: string;
}

export interface Kind {
  /** Ground painted under this tile (a key of `grounds`). */
  ground: keyof typeof grounds;
  walkable: boolean;
  /** Footprint in tiles for buildings (the letter fills a w×h block in the grid). Default 1×1. */
  size?: [number, number];
  /**
   * Something standing on the tile (tree, building), drawn as a y-sorted sprite.
   * `at` is the block's top-left tile, used to vary colors between neighbors.
   */
  object?: (n: Neighbors, at: { x: number; y: number }) => Sprite;
}

// ------------------------------------------------------------------ colors

const G = { base: 0x74a852, dark: 0x5f9442, light: 0x8cbc64, tuft: 0x4e8236 };
const DIRT = { base: 0x9a7b55, dark: 0x7d6142, light: 0xb2946a };
const GOLD = { base: 0xe3b234, light: 0xf5d266, dark: 0xb88a1e, edge: 0x8f6a14 };
/** The river is murky and light brown (contaminated by the data center's outflow). */
const WATER = { base: 0xa09473, deep: 0x938665, light: 0xc9bd9c, scum: 0x8a8a5a, bank: 0xc9b07a, bankDark: 0x6b6a3e, shadow: 0x6a5c40 };
const ASPHALT = { base: 0x4a4d52, light: 0x585c62, dark: 0x3e4146, curb: 0xa9abad, edgeLine: 0xe6e6e6, center: 0xf2c230 };
const CONCRETE = { base: 0xc9c6bf, seam: 0xaeaaa2, light: 0xd8d5ce };
const RAIL = { base: 0xc3c6cb, dark: 0x8c9096, light: 0xe2e4e7 };

const DRY = [0xb3a45a, 0xa38f4f, 0x8f9a4a, 0xc2b070];

const isRoad = (k: string) => k === 'road' || k === 'bridge';
const isPath = (k: string) => k === 'path';
const isWater = (k: string) => k === 'water';

/** Spread a block position into a variant 0–11 (12 = every palette size divides it), so neighbors differ. */
const vary = (at: { x: number; y: number }) => (at.x * 7 + at.y * 13) % 12;

// ------------------------------------------------------------------ grounds

export const grounds = {
  /** `dry` (0–1) yellows and thins the grass, e.g. close to the data center. */
  grass(p: PixelPainter, _n: Neighbors, rng: Rng, dry = 0) {
    p.rect(0, 0, TILE, TILE, G.base);
    for (let i = 0; i < 7; i++) p.px(rng.between(0, 15), rng.between(0, 15), rng.pick([G.dark, G.light]));
    if (dry > 0) {
      for (let i = 0; i < Math.round(dry * 40); i++) p.px(rng.between(0, 15), rng.between(0, 15), rng.pick(DRY));
      if (rng.frac() < dry * 0.8) {
        const cx = rng.between(3, 12);
        const cy = rng.between(3, 12);
        p.rect(cx - 2, cy - 1, 5, 3, DIRT.base).rect(cx - 1, cy - 2, 3, 5, DIRT.base).px(cx, cy, DIRT.dark);
      }
      if (dry > 0.6) return; // no fresh tufts this close
    }
    if (rng.frac() < 0.35) {
      const x = rng.between(2, 13);
      const y = rng.between(3, 14);
      p.px(x, y, G.tuft).px(x - 1, y - 1, G.tuft).px(x + 1, y - 1, G.tuft).px(x, y - 2, G.light);
    }
  },

  flowers(p: PixelPainter, n: Neighbors, rng: Rng, dry = 0) {
    grounds.grass(p, n, rng, dry);
    if (dry > 0.4) return; // flowers have died off near the data center
    for (let i = 0; i < 4; i++) {
      const x = rng.between(1, 14);
      const y = rng.between(2, 14);
      p.px(x, y, G.tuft).px(x, y - 1, rng.pick(C.flowers));
    }
  },

  dirt(p: PixelPainter, n: Neighbors, rng: Rng) {
    p.rect(0, 0, TILE, TILE, DIRT.base);
    for (let i = 0; i < 9; i++) p.px(rng.between(0, 15), rng.between(0, 15), rng.pick([DIRT.dark, DIRT.light]));
    // Ragged grass edge where dirt meets grass.
    const grassy = (k: string) => kinds[k]?.ground === 'grass' || kinds[k]?.ground === 'flowers';
    for (let i = 0; i < TILE; i += 2) {
      if (grassy(n(0, -1))) p.rect(i, 0, 2, rng.between(1, 2), G.base);
      if (grassy(n(0, 1))) p.rect(i, TILE - rng.between(1, 2), 2, 2, G.base);
      if (grassy(n(-1, 0))) p.rect(0, i, rng.between(1, 2), 2, G.base);
      if (grassy(n(1, 0))) p.rect(TILE - rng.between(1, 2), i, 2, 2, G.base);
    }
  },

  /** A golden footpath of warm cobbles (kept for small trails). */
  path(p: PixelPainter, n: Neighbors, rng: Rng) {
    p.rect(0, 0, TILE, TILE, GOLD.base);
    for (let y = 1; y < TILE; y += 5) {
      const off = (y / 5) % 2 ? 0 : 3;
      for (let x = off - 3; x < TILE; x += 6) {
        p.rect(x + 1, y, 4, 3, rng.frac() < 0.5 ? GOLD.light : GOLD.base).px(x + 1, y + 2, GOLD.dark).px(x + 4, y + 2, GOLD.dark);
      }
    }
    if (!isPath(n(0, -1))) p.rect(0, 0, TILE, 1, GOLD.edge);
    if (!isPath(n(0, 1))) p.rect(0, TILE - 1, TILE, 1, GOLD.edge);
    if (!isPath(n(-1, 0))) p.rect(0, 0, 1, TILE, GOLD.edge);
    if (!isPath(n(1, 0))) p.rect(TILE - 1, 0, 1, TILE, GOLD.edge);
  },

  /**
   * Asphalt road. Roads are 2 tiles wide: a white line and a curb along the
   * outer edges, a dashed yellow center line between the two lanes, and plain
   * asphalt where roads cross.
   */
  road(p: PixelPainter, n: Neighbors, rng: Rng) {
    p.rect(0, 0, TILE, TILE, ASPHALT.base);
    for (let i = 0; i < 10; i++) p.px(rng.between(0, 15), rng.between(0, 15), rng.pick([ASPHALT.light, ASPHALT.dark]));
    const [u, d, l, r] = [isRoad(n(0, -1)), isRoad(n(0, 1)), isRoad(n(-1, 0)), isRoad(n(1, 0))];
    // Outer edges: curb then a solid white line.
    if (!u) p.rect(0, 0, TILE, 1, ASPHALT.curb).rect(0, 2, TILE, 1, ASPHALT.edgeLine);
    if (!d) p.rect(0, TILE - 1, TILE, 1, ASPHALT.curb).rect(0, TILE - 3, TILE, 1, ASPHALT.edgeLine);
    if (!l) p.rect(0, 0, 1, TILE, ASPHALT.curb).rect(2, 0, 1, TILE, ASPHALT.edgeLine);
    if (!r) p.rect(TILE - 1, 0, 1, TILE, ASPHALT.curb).rect(TILE - 3, 0, 1, TILE, ASPHALT.edgeLine);
    // Center line on straight stretches only (not at crossings).
    const horizontal = l && r && u !== d && !(isRoad(n(0, d ? 2 : -2)));
    const vertical = u && d && l !== r && !(isRoad(n(r ? 2 : -2, 0)));
    if (horizontal) {
      const y = d ? TILE - 1 : 0;
      for (let x = 1; x < TILE; x += 8) p.rect(x, y, 5, 1, ASPHALT.center);
    } else if (vertical) {
      const x = r ? TILE - 1 : 0;
      for (let y = 1; y < TILE; y += 8) p.rect(x, y, 1, 5, ASPHALT.center);
    }
  },

  /** Concrete sidewalk with expansion joints. */
  sidewalk(p: PixelPainter, n: Neighbors, rng: Rng) {
    p.rect(0, 0, TILE, TILE, CONCRETE.base);
    for (let i = 0; i < 5; i++) p.px(rng.between(0, 15), rng.between(0, 15), CONCRETE.light);
    p.rect(0, 7, TILE, 1, CONCRETE.seam).rect(7, 0, 1, TILE, CONCRETE.seam);
    const curbAt = (k: string) => isRoad(k);
    if (curbAt(n(0, -1))) p.rect(0, 0, TILE, 2, RAIL.dark);
    if (curbAt(n(0, 1))) p.rect(0, TILE - 2, TILE, 2, RAIL.dark);
    if (curbAt(n(-1, 0))) p.rect(0, 0, 2, TILE, RAIL.dark);
    if (curbAt(n(1, 0))) p.rect(TILE - 2, 0, 2, TILE, RAIL.dark);
  },

  /** River water with sandy banks wherever it meets land, and shade under bridges. */
  water(p: PixelPainter, n: Neighbors, _rng: Rng) {
    p.rect(0, 0, TILE, TILE, WATER.base);
    p.rect(0, 5, TILE, 6, WATER.deep, 0.6);
    // Darker, muddier shallows along the banks.
    const shallow = (k: string) => k !== '' && !isWater(k) && k !== 'bridge';
    if (shallow(n(0, -1))) p.rect(0, 2, TILE, 2, WATER.deep, 0.7);
    if (shallow(n(0, 1))) p.rect(0, TILE - 4, TILE, 2, WATER.deep, 0.7);
    if (shallow(n(-1, 0))) p.rect(2, 0, 2, TILE, WATER.deep, 0.7);
    if (shallow(n(1, 0))) p.rect(TILE - 4, 0, 2, TILE, WATER.deep, 0.7);
    // Ripples, scum and glints are a moving layer on top (map/waterFlow.ts).
    const land = (k: string) => k !== '' && !isWater(k) && k !== 'bridge';
    if (land(n(0, -1))) p.rect(0, 0, TILE, 2, WATER.bank).rect(0, 0, TILE, 1, WATER.bankDark);
    if (land(n(0, 1))) p.rect(0, TILE - 2, TILE, 2, WATER.bank).rect(0, TILE - 1, TILE, 1, WATER.bankDark);
    if (land(n(-1, 0))) p.rect(0, 0, 2, TILE, WATER.bank).rect(0, 0, 1, TILE, WATER.bankDark);
    if (land(n(1, 0))) p.rect(TILE - 2, 0, 2, TILE, WATER.bank).rect(TILE - 1, 0, 1, TILE, WATER.bankDark);
    // Shadow cast by a bridge just upstream / to the side.
    if (n(0, -1) === 'bridge') {
      p.rect(0, 0, TILE, 4, WATER.shadow, 0.6).rect(0, 4, TILE, 1, WATER.shadow, 0.3);
      p.rect(5, 0, 6, 3, RAIL.dark).rect(5, 0, 1, 3, RAIL.base).rect(5, 3, 6, 1, WATER.light, 0.7); // concrete pier in the water
    }
    if (n(-1, 0) === 'bridge') p.rect(0, 0, 3, TILE, WATER.shadow, 0.5);
    if (n(1, 0) === 'bridge') p.rect(TILE - 3, 0, 3, TILE, WATER.shadow, 0.5);
  },

  /**
   * Road bridge: the asphalt deck continues, with concrete railings (top rail,
   * balusters, corner piers) along the water sides and expansion joints where
   * the deck meets land.
   */
  bridge(p: PixelPainter, n: Neighbors, rng: Rng) {
    grounds.road(p, n, rng);
    const along = (horizontal: boolean, at: number) => {
      // at = the railing's outer edge offset (0 = top/left, TILE - 6 = bottom/right).
      const R = (a: number, b: number, w: number, h: number, c: number, alpha = 1) =>
        horizontal ? p.rect(a, at + b, w, h, c, alpha) : p.rect(at + b, a, h, w, c, alpha);
      R(0, 0, TILE, 6, RAIL.dark); // base
      R(0, 0, TILE, 2, RAIL.light); // top rail
      R(0, 2, TILE, 1, RAIL.base);
      for (let i = 1; i < TILE; i += 3) R(i, 3, 1, 2, RAIL.light); // balusters
      R(0, 5, TILE, 1, 0x000000, 0.3);
    };
    const water = [isWater(n(0, -1)), isWater(n(0, 1)), isWater(n(-1, 0)), isWater(n(1, 0))];
    if (water[0]) along(true, 0);
    if (water[1]) along(true, TILE - 6);
    if (water[2]) along(false, 0);
    if (water[3]) along(false, TILE - 6);
    // Expansion joints and corner piers where the deck meets land.
    const land = (k: string) => k !== '' && !isWater(k) && k !== 'bridge';
    if (land(n(-1, 0))) p.rect(0, 0, 1, TILE, 0x2a2c30).rect(1, 0, 1, TILE, ASPHALT.light);
    if (land(n(1, 0))) p.rect(TILE - 1, 0, 1, TILE, 0x2a2c30).rect(TILE - 2, 0, 1, TILE, ASPHALT.light);
    if (land(n(0, -1))) p.rect(0, 0, TILE, 1, 0x2a2c30).rect(0, 1, TILE, 1, ASPHALT.light);
    if (land(n(0, 1))) p.rect(0, TILE - 1, TILE, 1, 0x2a2c30).rect(0, TILE - 2, TILE, 1, ASPHALT.light);
    const pier = (x: number, y: number) => p.rect(x, y, 4, 7, RAIL.base).rect(x, y, 4, 1, RAIL.light).rect(x + 3, y, 1, 7, RAIL.dark);
    if (water[0] && land(n(-1, 0))) pier(0, 0);
    if (water[0] && land(n(1, 0))) pier(TILE - 4, 0);
    if (water[1] && land(n(-1, 0))) pier(0, TILE - 7);
    if (water[1] && land(n(1, 0))) pier(TILE - 4, TILE - 7);
    if (water[2] && land(n(0, -1))) pier(0, 0);
    if (water[3] && land(n(0, -1))) pier(TILE - 4, 0);
    if (water[2] && land(n(0, 1))) pier(0, TILE - 7);
    if (water[3] && land(n(0, 1))) pier(TILE - 4, TILE - 7);
  },
};

// ------------------------------------------------------------------ objects

const fence = (n: Neighbors): Sprite => {
  const l = n(-1, 0) === 'fence';
  const r = n(1, 0) === 'fence';
  const u = n(0, -1) === 'fence';
  const d = n(0, 1) === 'fence';
  return {
    w: TILE,
    h: 20,
    variant: `${+l}${+r}${+u}${+d}`,
    draw: (p) => {
      const post = 0xfaf3e3;
      const shade = 0xcfc2a3;
      const rail = 0xe8dcc0;
      if (l) p.rect(0, 9, 8, 2, rail).rect(0, 14, 8, 2, rail);
      if (r) p.rect(8, 9, 8, 2, rail).rect(8, 14, 8, 2, rail);
      if (u) p.rect(7, 0, 2, 10, rail);
      if (d) p.rect(7, 10, 2, 10, rail);
      p.rect(6, 6, 4, 13, post).rect(9, 6, 1, 13, shade).rect(7, 5, 2, 1, post);
    },
  };
};

const stumpSprite: Sprite = {
  w: 10,
  h: 8,
  sink: -4,
  draw: (p) => {
    p.rect(1, 3, 8, 5, C.trunk).rect(7, 3, 2, 5, C.trunkDark);
    p.rect(1, 1, 8, 3, 0xd9b47a).px(4, 2, 0xb8915a).px(5, 2, 0xb8915a);
    p.px(0, 7, C.trunkDark).px(9, 7, C.trunkDark);
  },
};

const rockSprite: Sprite = {
  w: 14,
  h: 10,
  sink: -3,
  draw: (p) => {
    p.rect(1, 3, 12, 7, C.rock).rect(3, 1, 8, 3, C.rock).rect(3, 2, 5, 2, C.rockLight).rect(10, 5, 3, 5, 0x7f7f75);
  },
};

const wellSprite: Sprite = {
  w: 18,
  h: 26,
  sink: -1,
  draw: (p) => {
    for (let i = 0; i < 5; i++) p.rect(4 - i, i, 10 + i * 2, 1, i % 2 ? 0xa8463a : 0xc0473a);
    p.rect(2, 5, 2, 10, 0x6b4423).rect(14, 5, 2, 10, 0x6b4423).rect(4, 8, 10, 1, 0xa8743e);
    p.rect(8, 9, 1, 5, 0x3a3a3a).rect(7, 13, 3, 2, 0xa8743e);
    p.rect(0, 15, 18, 10, C.stone).rect(0, 15, 18, 2, C.stoneShade).rect(2, 17, 14, 2, 0x2f4f6f);
    for (let x = 0; x < 18; x += 5) p.rect(x, 20, 1, 5, C.stoneDark);
    p.rect(0, 22, 18, 1, C.stoneDark);
  },
};

/** A 1-tile street prop: drawn standing on the tile's bottom edge. */
const prop = (w: number, h: number, draw: (p: PixelPainter) => void, sink = -3): Kind['object'] => () => ({ w, h, sink, draw });
/** A prop whose colors vary by position. */
const variedProp =
  (w: number, h: number, draw: (p: PixelPainter, v: number) => void, sink = -3): Kind['object'] =>
  (_n, at) => {
    const v = vary(at);
    return { w, h, sink, variant: String(v), draw: (p) => draw(p, v) };
  };

export const kinds: Record<string, Kind> = {
  // Ground.
  grass: { ground: 'grass', walkable: true },
  flowers: { ground: 'flowers', walkable: true },
  dirt: { ground: 'dirt', walkable: true },
  path: { ground: 'path', walkable: true },
  road: { ground: 'road', walkable: true },
  sidewalk: { ground: 'sidewalk', walkable: true },
  water: { ground: 'water', walkable: false },
  bridge: { ground: 'bridge', walkable: true },

  // Nature.
  'tree-pine': { ground: 'grass', walkable: false, object: () => ({ w: 22, h: 42, sink: -2, draw: pine }) },
  'tree-oak': { ground: 'grass', walkable: false, object: () => ({ w: 30, h: 36, sink: -2, draw: oak }) },
  bush: { ground: 'grass', walkable: false, object: () => ({ w: 20, h: 11, sink: -2, draw: bush }) },
  rock: { ground: 'grass', walkable: false, object: () => rockSprite },
  stump: { ground: 'dirt', walkable: false, object: () => stumpSprite },
  fence: { ground: 'grass', walkable: false, object: fence },

  // Street furniture.
  well: { ground: 'grass', walkable: false, object: () => wellSprite },
  'trash-can': { ground: 'grass', walkable: false, object: variedProp(10, 15, trashCan) },
  mailbox: { ground: 'grass', walkable: false, object: variedProp(10, 16, mailbox) },
  /** Alex's own mailbox (teal, like Alex's shirt). */
  'alex-mailbox': { ground: 'grass', walkable: false, object: prop(10, 16, (p) => mailbox(p, 0, 0x2e9e8f)) },
  bench: { ground: 'grass', walkable: false, object: prop(18, 12, bench) },
  'stop-sign': { ground: 'sidewalk', walkable: false, object: prop(12, 26, stopSign) },
  'street-sign': { ground: 'sidewalk', walkable: false, object: prop(14, 26, streetSign) },
  lamp: { ground: 'sidewalk', walkable: false, object: prop(8, 36, streetLamp) },
  hydrant: { ground: 'sidewalk', walkable: false, object: prop(9, 12, hydrant) },
  /** Parked car on a concrete driveway: 2×1 tiles. */
  car: { ground: 'sidewalk', walkable: false, size: [2, 1], object: variedProp(34, 18, car, -1) },

  // Buildings.
  /** Alex's cottage: 3×2 tiles. */
  cottage: {
    ground: 'grass',
    walkable: false,
    size: [3, 2],
    object: () => ({ w: 48, h: 48, sink: 2, draw: (p) => cottage(p, 2, 46) }),
  },
  /** A neighbor's gable-roof house (colors vary): 3×2 tiles. */
  house: { ground: 'grass', walkable: false, size: [3, 2], object: variedProp(48, 48, gableHouse, 2) },
  /** A flat-roof modern house (colors vary): 3×2 tiles. */
  'house-modern': { ground: 'grass', walkable: false, size: [3, 2], object: variedProp(48, 46, modernHouse, 2) },
  /** A two-story house with a porch (colors vary): 3×2 tiles. */
  'house-tall': { ground: 'grass', walkable: false, size: [3, 2], object: variedProp(48, 62, tallHouse, 2) },
  /** A shop with an awning; its sign shows a cup, bread, book or pharmacy cross: 4×2 tiles. */
  shop: { ground: 'sidewalk', walkable: false, size: [4, 2], object: variedProp(64, 50, shop, 2) },
  /** Town hall: 8×3 tiles. */
  'town-hall': {
    ground: 'grass',
    walkable: false,
    size: [8, 3],
    object: () => ({
      w: 128,
      h: 112,
      sink: 6,
      draw: (p) => townHall(p, 4, 105, { flagpole: false, wingRoofs: false, belfry: false }),
    }),
  },
  /** The data center behind its fence: 9×3 tiles. */
  'data-center': {
    ground: 'dirt',
    walkable: false,
    size: [9, 3],
    object: () => ({ w: 148, h: 84, sink: 2, draw: (p) => dataCenter(p, 10, 78) }),
  },
};

/** Paint the ground for one tile (p is already offset to the tile's top-left). `dry` 0–1 withers grass. */
export function paintGround(p: PixelPainter, kind: string, n: Neighbors, rng: Rng, dry = 0): void {
  const k = kinds[kind];
  if (k) grounds[k.ground](p, n, rng, dry);
}
