import Phaser from 'phaser';
import { makeTexture } from '../art/pixel';
import type { ParsedMap } from './grid';
import { MAP_SCALE, TILE } from './kinds';

const TILE_PX = TILE * MAP_SCALE;
const FLOW_SPEED = 22; // screen px per second

/**
 * Makes a map's water look like it is flowing: every water tile gets a
 * scrolling layer of ripples and murky scum, moving along the river's
 * direction (down a vertical stretch, sideways along a horizontal one).
 */
export function addWaterFlow(scene: Phaser.Scene, grid: ParsedMap, kind = 'water'): (deltaMs: number) => void {
  const ripple = (key: string, vertical: boolean) =>
    makeTexture(
      scene,
      key,
      TILE,
      TILE,
      (p) => {
        const crest = 0xe2d8bd;
        const trough = 0x857858;
        const scum = 0x8f8a55;
        // Plot in "flow space" (a = across the river, b = along it), so one drawing serves both directions.
        const dot = (a: number, b: number, c: number, alpha: number) => (vertical ? p.px(a, b, c, alpha) : p.px(b, a, c, alpha));
        // A wavelet: a bright curved crest with a darker trough just downstream, like light on moving water.
        const wave = (a: number, b: number, w: number) => {
          dot(a, b + 1, crest, 0.45);
          for (let i = 1; i < w - 1; i++) dot(a + i, b, crest, 0.6);
          dot(a + w - 1, b + 1, crest, 0.45);
          for (let i = 1; i < w - 1; i++) dot(a + i, b + 1, trough, 0.3);
        };
        wave(2, 3, 6);
        wave(9, 11, 5);
        // A little floating scum drifting with the current.
        dot(12, 6, scum, 0.8);
        dot(13, 6, scum, 0.8);
      },
      MAP_SCALE,
    );
  const vKey = ripple('water-flow-v', true);
  const hKey = ripple('water-flow-h', false);
  const isWet = (x: number, y: number) => grid.kindAt(x, y) === kind || grid.kindAt(x, y) === 'bridge';
  const bank = 2 * MAP_SCALE; // keep the sandy banks still

  const layers: { sprite: Phaser.GameObjects.TileSprite; vertical: boolean }[] = [];
  for (const t of grid.tilesOf(kind)) {
    const vertical = isWet(t.x, t.y - 1) || isWet(t.x, t.y + 1);
    const left = isWet(t.x - 1, t.y) ? 0 : bank;
    const right = isWet(t.x + 1, t.y) ? 0 : bank;
    const top = isWet(t.x, t.y - 1) ? 0 : bank;
    const bottom = isWet(t.x, t.y + 1) ? 0 : bank;
    const sprite = scene.add
      .tileSprite(t.x * TILE_PX + left, t.y * TILE_PX + top, TILE_PX - left - right, TILE_PX - top - bottom, vertical ? vKey : hKey)
      .setOrigin(0)
      .setDepth(-0.8);
    // Line the pattern up with the world so neighboring tiles flow as one surface.
    sprite.setTilePosition(left + t.x * TILE_PX, top + t.y * TILE_PX);
    layers.push({ sprite, vertical });
  }

  // A few glints that twinkle on the surface.
  const glint = makeTexture(
    scene,
    'water-glint',
    3,
    3,
    (p) => p.px(1, 0, 0xffffff).rect(0, 1, 3, 1, 0xffffff).px(1, 2, 0xffffff),
    MAP_SCALE,
  );
  const water = grid.tilesOf(kind);
  for (let i = 0; i < Math.min(40, Math.ceil(water.length / 2)); i++) {
    const t = water[Math.floor(Math.random() * water.length)];
    const g = scene.add
      .image((t.x + 0.2 + Math.random() * 0.6) * TILE_PX, (t.y + 0.2 + Math.random() * 0.6) * TILE_PX, glint)
      .setDepth(-0.7)
      .setAlpha(0);
    scene.tweens.add({
      targets: g,
      alpha: 0.75,
      duration: 380,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 3000,
      repeatDelay: 1500 + Math.random() * 3000,
    });
  }

  return (deltaMs) => {
    const d = (FLOW_SPEED * deltaMs) / 1000;
    for (const { sprite, vertical } of layers) {
      if (vertical) sprite.tilePositionY -= d;
      else sprite.tilePositionX -= d;
    }
  };
}
